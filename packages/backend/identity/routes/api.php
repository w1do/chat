<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Vendor\Identity\Presentation\Http\Api\V1\Controllers\AuthController;
use Vendor\Identity\Presentation\Http\Api\V1\Controllers\AvatarController;
use Vendor\Identity\Presentation\Http\Api\V1\Controllers\MeController;
use Vendor\Identity\Presentation\Http\Api\V1\Controllers\ProfileController;
use Vendor\Identity\Presentation\Http\Api\V1\Controllers\ProfileImageFileController;
use Vendor\Identity\Presentation\Http\Api\V1\Controllers\WallpaperController;
use Vendor\Identity\Presentation\Http\Middleware\UseBrowserTokenCookie;

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
                ->middleware(UseBrowserTokenCookie::class)->name('logout');
            Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
                ->middleware('throttle:identity-password-reset')->name('forgot-password');
            Route::post('/reset-password', [AuthController::class, 'resetPassword'])
                ->middleware('throttle:identity-password-reset')->name('reset-password');
        });

        Route::middleware(UseBrowserTokenCookie::class)->group(function (): void {
            Route::get('/me', [MeController::class, 'show'])->name('me');
            Route::patch('/me/profile', [ProfileController::class, 'update'])->name('profile.update');
            Route::patch('/me/email', [ProfileController::class, 'updateEmail'])
                ->middleware('throttle:identity-password-reset')->name('profile.email');
            Route::patch('/me/password', [ProfileController::class, 'changePassword'])
                ->middleware('throttle:identity-password-reset')->name('profile.password');

            // Аватарки: набор — личное дело владельца, поэтому все действия
            // идут через /me и чужой профиль недостижим по построению.
            Route::get('/me/avatars', [AvatarController::class, 'index'])->name('avatars.index');
            Route::post('/me/avatars', [AvatarController::class, 'store'])
                ->middleware('throttle:identity-images')->name('avatars.store');
            Route::patch('/me/avatars/{avatar}', [AvatarController::class, 'select'])->name('avatars.select');
            Route::delete('/me/avatars/{avatar}', [AvatarController::class, 'destroy'])->name('avatars.delete');
            Route::delete('/me/avatar', [AvatarController::class, 'clear'])->name('avatars.clear');

            Route::post('/me/wallpaper', [WallpaperController::class, 'store'])
                ->middleware('throttle:identity-images')->name('wallpaper.store');
            Route::delete('/me/wallpaper', [WallpaperController::class, 'destroy'])->name('wallpaper.delete');

            // Файлы отдаёт приложение: бакет закрыт (ADR-011). В адресе —
            // uuid медиа, поэтому он меняется вместе с картинкой.
            Route::get('/avatars/{image}', [ProfileImageFileController::class, 'avatar'])->name('avatars.show');
            Route::get('/avatars/{image}/thumb', [ProfileImageFileController::class, 'avatarThumb'])->name('avatars.thumb');
            Route::get('/wallpapers/{image}', [ProfileImageFileController::class, 'wallpaper'])->name('wallpapers.show');
        });
    });
