<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Form extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'fields',
        'status',
    ];

    protected $casts = [
        'fields' => 'array',
    ];

    protected $appends = ['analytics'];

    // Relationship to User (works for both User and SuperAdmin via user_id)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Relationship to FormResponses
    public function responses()
    {
        return $this->hasMany(FormResponse::class);
    }

    // Computed analytics attribute
    public function getAnalyticsAttribute()
    {
        $totalRespondents = $this->responses()->count();
        $recentActivityCount = $this->responses()
            ->where('created_at', '>=', now()->subHour())
            ->count();

        $recentActivityPercent = 0;
        if ($totalRespondents > 0) {
            $recentActivityPercent = round(($recentActivityCount / $totalRespondents) * 100, 2);
        }

        return [
            'totalRespondents' => $totalRespondents,
            'completionRate' => $totalRespondents > 0 ? 100 : 0, // Simplified for now
            'recentActivity' => $recentActivityPercent,
        ];
    }
}
