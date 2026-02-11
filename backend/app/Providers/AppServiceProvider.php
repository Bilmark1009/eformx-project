<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
// ✅ These imports are required for the Brevo integration
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoTransportFactory;
use Symfony\Component\Mailer\Transport\Dsn;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ✅ This registers the 'brevo' driver so Laravel knows how to use your API key
        Mail::extend('brevo', function () {
            return (new BrevoTransportFactory)->create(
                new Dsn(
                    'brevo+api', 
                    'default', 
                    config('services.brevo.key')
                )
            );
        });
    }
}