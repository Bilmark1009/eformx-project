<?php

return [

    'paths' => ['api/*', 'login', 'logout', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'https://e-formx.netlify.app',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://backend.test'
    ],

    // Patterns for dynamic origins like Netlify Deploy Previews
    'allowed_origins_patterns' => [
        '#^https://.*--e-formx\.netlify\.app$#'
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];