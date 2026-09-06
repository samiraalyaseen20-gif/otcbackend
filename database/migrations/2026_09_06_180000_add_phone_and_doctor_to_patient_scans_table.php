<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('patient_scans', function (Blueprint $table) {
            $table->string('patient_phone')->nullable()->after('patient_name');
            $table->string('doctor_name')->nullable()->after('patient_phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patient_scans', function (Blueprint $table) {
            $table->dropColumn(['patient_phone', 'doctor_name']);
        });
    }
};
