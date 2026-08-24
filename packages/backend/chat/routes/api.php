<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Vendor\Chat\Presentation\Http\Api\V1\Controllers\MemberController;
use Vendor\Chat\Presentation\Http\Api\V1\Controllers\MessageController;
use Vendor\Chat\Presentation\Http\Api\V1\Controllers\ReactionController;
use Vendor\Chat\Presentation\Http\Api\V1\Controllers\RoomController;

Route::prefix(config('chat.routes.prefix', 'api/v1'))
    ->middleware([...config('chat.routes.middleware', ['api']), 'auth:sanctum'])
    ->name('chat.')
    ->scopeBindings()
    ->group(function (): void {
        Route::get('/rooms', [RoomController::class, 'index'])->name('rooms.index');
        Route::post('/rooms', [RoomController::class, 'store'])->name('rooms.store');
        Route::get('/rooms/{room}', [RoomController::class, 'show'])->name('rooms.show');
        Route::patch('/rooms/{room}', [RoomController::class, 'update'])->name('rooms.update');
        Route::delete('/rooms/{room}', [RoomController::class, 'destroy'])->name('rooms.archive');

        Route::get('/rooms/{room}/members', [MemberController::class, 'index'])->name('members.index');
        Route::post('/rooms/{room}/members', [MemberController::class, 'store'])->name('members.invite');
        Route::post('/rooms/{room}/members/me', [MemberController::class, 'join'])->name('members.join');
        Route::delete('/rooms/{room}/members/me', [MemberController::class, 'leave'])->name('members.leave');
        Route::patch('/rooms/{room}/members/{member}', [MemberController::class, 'update'])->name('members.role');

        Route::get('/rooms/{room}/messages', [MessageController::class, 'index'])->name('messages.index');
        Route::post('/rooms/{room}/messages', [MessageController::class, 'store'])->name('messages.send');
        Route::get('/messages/{message}', [MessageController::class, 'show'])->name('messages.show')->withTrashed();
        Route::patch('/messages/{message}', [MessageController::class, 'update'])->name('messages.update');
        Route::delete('/messages/{message}', [MessageController::class, 'destroy'])->name('messages.delete');
        Route::post('/messages/{message}/reactions', [ReactionController::class, 'toggle'])->name('reactions.toggle');
    });
