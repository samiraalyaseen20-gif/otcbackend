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
                'FileUrl' => asset(Storage::url($scan->file_path)),
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

        // Store the uploaded file in storage/app/public/dicom_files
        $filePath = $request->file('dicom_file')->store('dicom_files', 'public');

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
            'data' => $scan,
        ], 201);
    }
}
