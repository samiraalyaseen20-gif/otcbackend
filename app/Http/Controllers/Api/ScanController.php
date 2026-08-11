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
                'StudyDate' => $scan->study_date,
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
            'study_date' => 'nullable|string',
            'dicom_file' => 'required|file',
        ]);

        // Store the uploaded file in storage/app/public/dicom_files
        $filePath = $request->file('dicom_file')->store('dicom_files', 'public');

        // Save record into patient_scans table
        $scan = PatientScan::create([
            'patient_id' => $validated['patient_id'],
            'patient_name' => $validated['patient_name'],
            'study_date' => $validated['study_date'] ?? null,
            'file_path' => $filePath,
        ]);

        return response()->json([
            'message' => 'DICOM scan uploaded successfully',
            'data' => $scan,
        ], 201);
    }
}
