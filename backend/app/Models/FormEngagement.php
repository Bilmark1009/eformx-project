<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormEngagement extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_id',
        'student_id',
        'status',
        'viewed_at',
        'submitted_at',
    ];

    protected $casts = [
        'viewed_at' => 'datetime',
        'submitted_at' => 'datetime',
    ];

    public function form()
    {
        return $this->belongsTo(Form::class);
    }
}
