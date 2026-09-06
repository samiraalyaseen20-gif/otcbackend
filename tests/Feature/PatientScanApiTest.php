<?php

namespace Tests\Feature;

use App\Models\PatientScan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PatientScanApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_upload_patient_dicom_scan(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->create('sample_scan.dcm', 500, 'application/dicom');

        $payload = [
            'patient_id' => 'P-100234',
            'patient_name' => 'John Doe',
            'patient_phone' => '07701234567',
            'doctor_name' => 'Dr. Smith',
            'study_date' => '2026-08-11',
            'dicom_file' => $file,
        ];

        $response = $this->postJson('/api/scans', $payload);

        $response->assertStatus(201)
                 ->assertJsonStructure([
                     'message',
                     'data' => [
                         'id',
                         'patient_id',
                         'patient_name',
                         'patient_phone',
                         'doctor_name',
                         'study_date',
                         'file_path',
                         'created_at',
                         'updated_at',
                     ],
                 ]);

        $this->assertDatabaseHas('patient_scans', [
            'patient_id' => 'P-100234',
            'patient_name' => 'John Doe',
            'patient_phone' => '07701234567',
            'doctor_name' => 'Dr. Smith',
            'study_date' => '2026-08-11',
        ]);

        $scan = PatientScan::first();
        Storage::disk('public')->assertExists($scan->file_path);
    }

    public function test_can_fetch_all_patient_scans(): void
    {
        PatientScan::create([
            'patient_id' => 'P-999',
            'patient_name' => 'Test Patient',
            'patient_phone' => '07701234567',
            'doctor_name' => 'Dr. Alice',
            'study_date' => '2026-08-11',
            'file_path' => 'dicom_files/test.dcm',
        ]);

        $response = $this->getJson('/api/scans');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     '*' => [
                         'id',
                         'PatientId',
                         'PatientName',
                         'PatientPhone',
                         'DoctorName',
                         'StudyDate',
                         'CreatedAt',
                         'FileUrl',
                     ],
                 ]);
    }

    public function test_can_delete_single_scan(): void
    {
        Storage::fake('public');

        $filePath = 'dicom_files/test_delete.dcm';
        Storage::disk('public')->put($filePath, 'fake content');

        $scan = PatientScan::create([
            'patient_id' => 'P-DEL1',
            'patient_name' => 'Delete Target',
            'file_path' => $filePath,
        ]);

        $response = $this->deleteJson('/api/scans/' . $scan->id);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('patient_scans', ['id' => $scan->id]);
        Storage::disk('public')->assertMissing($filePath);
    }

    public function test_can_delete_all_patient_scans(): void
    {
        Storage::fake('public');

        $file1 = 'dicom_files/file1.dcm';
        $file2 = 'dicom_files/file2.dcm';
        Storage::disk('public')->put($file1, 'fake content 1');
        Storage::disk('public')->put($file2, 'fake content 2');

        PatientScan::create([
            'patient_id' => 'P-DELALL',
            'patient_name' => 'Full Delete Target',
            'file_path' => $file1,
        ]);

        PatientScan::create([
            'patient_id' => 'P-DELALL',
            'patient_name' => 'Full Delete Target',
            'file_path' => $file2,
        ]);

        $response = $this->deleteJson('/api/patients/P-DELALL');

        $response->assertStatus(200);
        $this->assertDatabaseMissing('patient_scans', ['patient_id' => 'P-DELALL']);
        Storage::disk('public')->assertMissing($file1);
        Storage::disk('public')->assertMissing($file2);
    }
}
