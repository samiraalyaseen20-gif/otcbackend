<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PatientScan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ScanController extends Controller
{
    /**
     * Display a listing of patient DICOM scans.
     */
    public function index()
    {
        $scans = PatientScan::latest()->get()->map(function ($scan) {
            return [
                'id' => $scan->id,
                'PatientId' => $scan->patient_id,
                'PatientName' => $scan->patient_name,
                'PatientPhone' => $scan->patient_phone,
                'DoctorName' => $scan->doctor_name,
                'StudyDate' => $scan->study_date,
                'CreatedAt' => $scan->created_at ? $scan->created_at->format('Y-m-d H:i:s') : null,
                'FileUrl' => Storage::url($scan->file_path),
            ];
        });

        return response()->json($scans, 200);
    }

    /**
     * Store a newly created patient DICOM scan in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|string',
            'patient_name' => 'required|string',
            'patient_phone' => 'nullable|string',
            'doctor_name' => 'nullable|string',
            'study_date' => 'nullable|string',
            'dicom_file' => 'required|file',
        ]);

        // Store the uploaded file in storage/app/public/dicom_files (accessible via /storage/ symlink)
        $file = $request->file('dicom_file');
        $filename = time() . '_' . str_replace(' ', '_', $file->getClientOriginalName());
        $filePath = 'dicom_files/' . $filename;
        Storage::disk('public')->put($filePath, file_get_contents($file->getRealPath()));

        // Save record into patient_scans table
        $scan = PatientScan::create([
            'patient_id' => $validated['patient_id'],
            'patient_name' => $validated['patient_name'],
            'patient_phone' => $validated['patient_phone'] ?? null,
            'doctor_name' => $validated['doctor_name'] ?? null,
            'study_date' => $validated['study_date'] ?? null,
            'file_path' => $filePath,
        ]);

        return response()->json([
            'message' => 'DICOM scan uploaded successfully',
            'data' => [
                'id' => $scan->id,
                'patient_id' => $scan->patient_id,
                'patient_name' => $scan->patient_name,
                'patient_phone' => $scan->patient_phone,
                'doctor_name' => $scan->doctor_name,
                'study_date' => $scan->study_date,
                'file_path' => $scan->file_path,
                'FileUrl' => Storage::url($scan->file_path),
                'created_at' => $scan->created_at ? $scan->created_at->format('Y-m-d H:i:s') : null,
            ],
        ], 201);
    }

    /**
     * Remove the specified DICOM scan from storage and database.
     */
    public function destroy($id)
    {
        $scan = PatientScan::find($id);

        if (!$scan) {
            return response()->json(['message' => 'Scan not found'], 404);
        }

        // Delete physical DICOM file from public folder
        if ($scan->file_path && Storage::disk('public')->exists($scan->file_path)) {
            Storage::disk('public')->delete($scan->file_path);
        }

        $scan->delete();

        return response()->json(['message' => 'Scan deleted successfully'], 200);
    }

    /**
     * Remove all DICOM scans for a specific patient ID.
     */
    public function destroyByPatient($patientId)
    {
        $scans = PatientScan::where('patient_id', $patientId)->get();

        if ($scans->isEmpty()) {
            return response()->json(['message' => 'No scans found for this patient'], 404);
        }

        foreach ($scans as $scan) {
            if ($scan->file_path && Storage::disk('public')->exists($scan->file_path)) {
                Storage::disk('public')->delete($scan->file_path);
            }
            $scan->delete();
        }

        return response()->json(['message' => 'Patient profile and all DICOM files deleted successfully'], 200);
    }

    /**
     * Update patient data across all their scans.
     */
    public function updatePatient(Request $request, $patientId)
    {
        $validated = $request->validate([
            'patient_name' => 'required|string',
            'patient_phone' => 'nullable|string',
            'doctor_name' => 'nullable|string',
        ]);

        $scans = PatientScan::where('patient_id', $patientId)->get();

        if ($scans->isEmpty()) {
            return response()->json(['message' => 'No scans found for this patient yet'], 200);
        }

        foreach ($scans as $scan) {
            $scan->patient_name = $validated['patient_name'];
            if (array_key_exists('patient_phone', $validated)) {
                $scan->patient_phone = $validated['patient_phone'];
            }
            if (array_key_exists('doctor_name', $validated)) {
                $scan->doctor_name = $validated['doctor_name'];
            }
            $scan->save();
        }

        return response()->json(['message' => 'Patient updated successfully'], 200);
    }

    /**
     * Replace the DICOM file for a specific scan.
     */
    public function replaceScanFile(Request $request, $id)
    {
        $scan = PatientScan::find($id);

        if (!$scan) {
            return response()->json(['message' => 'Scan not found'], 404);
        }

        $request->validate([
            'dicom_file' => 'required|file',
        ]);

        // Delete old file
        if ($scan->file_path && Storage::disk('public')->exists($scan->file_path)) {
            Storage::disk('public')->delete($scan->file_path);
        }

        // Store new file in storage
        $file = $request->file('dicom_file');
        $filename = time() . '_' . str_replace(' ', '_', $file->getClientOriginalName());
        $filePath = 'dicom_files/' . $filename;
        Storage::disk('public')->put($filePath, file_get_contents($file->getRealPath()));
        
        $scan->file_path = $filePath;
        $scan->save();

        return response()->json([
            'message' => 'DICOM scan replaced successfully',
            'data' => [
                'id' => $scan->id,
                'FileUrl' => Storage::url($scan->file_path),
            ]
        ], 200);
    }
}
