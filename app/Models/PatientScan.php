<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientScan extends Model
{
    protected $fillable = [
        'patient_id',
        'patient_name',
        'patient_phone',
        'doctor_name',
        'study_date',
        'file_path',
    ];
}
