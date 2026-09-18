<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\PatientScan;

class PatientController extends Controller
{
    public function index()
    {
        return Inertia::render('Patients/Index', [
            'patients' => PatientScan::latest()->paginate(10)
        ]);
    }

    public function show($id)
    {
        $patient = PatientScan::findOrFail($id);
        
        // Generate a URL to the DICOM file if it exists locally
        if ($patient->file_path) {
            $patient->dicom_url = asset($patient->file_path);
        }

        return Inertia::render('Patients/Show', [
            'patient' => $patient
        ]);
    }
}
