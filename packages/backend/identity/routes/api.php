<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Vendor\Identity\Presentation\Http\Api\V1\Controllers\AuthController;
use Vendor\Identity\Presentation\Http\Api\V1\Controllers\MeController;
use Vendor\Identity\Presentation\Http\Api\V1\Controllers\ProfileController;

Route::prefix(config('identity.routes.prefix', 'api/v1'))
    ->middleware(config('identity.routes.middleware', ['api']))
    ->name('identity.')
    ->group(function (): void {
        Route::prefix('auth')->group(function (): void {
            Route::post('/register', [AuthController::class, 'register'])
                ->middleware('throttle:identity-register')->name('register');
            Route::post('/login', [AuthController::class, 'login'])
                ->middleware('throttle:identity-login')->name('login');
            Route::post('/logout', [AuthController::class, 'logout'])
                ->middleware('auth:sanctum')->name('logout');
            Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
                ->middleware('throttle:identity-password-reset')->name('forgot-password');
            Route::post('/reset-password', [AuthController::class, 'resetPassword'])
                ->middleware('throttle:identity-password-reset')->name('reset-password');
        });

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::get('/me', [MeController::class, 'show'])->name('me');
            Route::patch('/me/profile', [ProfileController::class, 'update'])->name('profile.update');
            Route::patch('/me/email', [ProfileController::class, 'updateEmail'])
                ->middleware('throttle:identity-password-reset')->name('profile.email');
            Route::patch('/me/password', [ProfileController::class, 'changePassword'])
                ->middleware('throttle:identity-password-reset')->name('profile.password');
        });
    });
