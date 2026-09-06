<?php

use App\Http\Controllers\Api\ScanController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/scans', [ScanController::class, 'index']);
Route::post('/scans', [ScanController::class, 'store']);
Route::delete('/scans/{id}', [ScanController::class, 'destroy']);
Route::delete('/patients/{patient_id}', [ScanController::class, 'destroyByPatient']);
