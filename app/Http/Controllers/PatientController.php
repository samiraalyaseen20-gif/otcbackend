<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\PatientScan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->get('search', '');

        // Group scans by patient_id to build patient profiles
        $patientsQuery = PatientScan::select(
                'patient_id',
                DB::raw('MAX(patient_name) as patient_name'),
                DB::raw('MAX(patient_phone) as patient_phone'),
                DB::raw('MAX(doctor_name) as doctor_name'),
                DB::raw('MAX(created_at) as latest_created_at'),
                DB::raw('COUNT(*) as scans_count')
            )
            ->groupBy('patient_id')
            ->orderByDesc('latest_created_at');

        if ($search) {
            $patientsQuery->where(function ($q) use ($search) {
                $q->where('patient_name', 'like', "%{$search}%")
                  ->orWhere('patient_phone', 'like', "%{$search}%")
                  ->orWhere('doctor_name', 'like', "%{$search}%")
                  ->orWhere('patient_id', 'like', "%{$search}%");
            });
        }

        $patients = $patientsQuery->paginate(15)->withQueryString();

        return Inertia::render('Patients/Index', [
            'patients' => $patients,
            'filters' => ['search' => $search],
        ]);
    }

    public function show($patientId)
    {
        // Get all scans for this patient_id
        $scans = PatientScan::where('patient_id', $patientId)
            ->orderByDesc('study_date')
            ->get()
            ->map(function ($scan) {
                // Storage::url() generates /storage/dicom_files/... which is correct
                // when files are stored via Storage::disk('public') and storage:link exists
                $scan->dicom_url = $scan->file_path ? Storage::url($scan->file_path) : null;
                return $scan;
            });

        if ($scans->isEmpty()) {
            abort(404);
        }

        $firstScan = $scans->first();

        $patient = [
            'patient_id'   => $patientId,
            'patient_name' => $firstScan->patient_name,
            'patient_phone'=> $firstScan->patient_phone,
            'doctor_name'  => $firstScan->doctor_name,
            'scans'        => $scans,
        ];

        return Inertia::render('Patients/Show', [
            'patient' => $patient,
        ]);
    }
}
