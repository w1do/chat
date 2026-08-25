<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Vendor\Chat\Presentation\Http\Api\V1\Controllers\InviteController;
use Vendor\Chat\Presentation\Http\Api\V1\Controllers\MemberController;
use Vendor\Chat\Presentation\Http\Api\V1\Controllers\MessageController;
use Vendor\Chat\Presentation\Http\Api\V1\Controllers\ReactionController;
use Vendor\Chat\Presentation\Http\Api\V1\Controllers\RoomController;
use Vendor\Chat\Presentation\Http\Api\V1\Controllers\RoomPhotoController;
use Vendor\Chat\Presentation\Http\Api\V1\Controllers\SearchController;
use Vendor\Chat\Presentation\Http\Api\V1\Controllers\TypingController;

Route::prefix(config('chat.routes.prefix', 'api/v1'))
    ->middleware([...config('chat.routes.middleware', ['api']), 'auth:sanctum'])
    ->name('chat.')
    ->scopeBindings()
    ->group(function (): void {
        Route::get('/rooms', [RoomController::class, 'index'])->name('rooms.index');
        Route::post('/rooms', [RoomController::class, 'store'])->name('rooms.store');
        Route::get('/rooms/{room}', [RoomController::class, 'show'])->name('rooms.show');
        Route::patch('/rooms/{room}', [RoomController::class, 'update'])->name('rooms.update');
        Route::delete('/rooms/{room}', [RoomController::class, 'destroy'])->name('rooms.delete');
        Route::post('/rooms/{room}/archive', [RoomController::class, 'archive'])->name('rooms.archive');

        // Фотография комнаты: ставят владелец и админ, файл отдаёт приложение.
        Route::post('/rooms/{room}/photo', [RoomPhotoController::class, 'store'])
            ->middleware('throttle:chat-images')->name('rooms.photo.set');
        Route::delete('/rooms/{room}/photo', [RoomPhotoController::class, 'destroy'])->name('rooms.photo.clear');
        Route::get('/room-photos/{image}', [RoomPhotoController::class, 'show'])->name('room-photos.show');
        Route::get('/room-photos/{image}/thumb', [RoomPhotoController::class, 'thumb'])->name('room-photos.thumb');

        Route::get('/rooms/{room}/members', [MemberController::class, 'index'])->name('members.index');
        // Поиск людей — это приглашение: та же частота, что и у самих приглашений.
        Route::get('/rooms/{room}/member-candidates', [MemberController::class, 'candidates'])
            ->middleware('throttle:chat-invites')
            ->name('members.candidates');
        Route::post('/rooms/{room}/members', [MemberController::class, 'store'])->name('members.invite');
        Route::post('/rooms/{room}/members/me', [MemberController::class, 'join'])->name('members.join');
        Route::delete('/rooms/{room}/members/me', [MemberController::class, 'leave'])->name('members.leave');
        Route::patch('/rooms/{room}/members/{member}', [MemberController::class, 'update'])->name('members.role');
        Route::delete('/rooms/{room}/members/{member}', [MemberController::class, 'destroy'])->name('members.remove');

        Route::get('/rooms/{room}/messages', [MessageController::class, 'index'])->name('messages.index');
        Route::post('/rooms/{room}/messages', [MessageController::class, 'store'])->name('messages.send');
        Route::get('/messages/{message}', [MessageController::class, 'show'])->name('messages.show')->withTrashed();
        Route::patch('/messages/{message}', [MessageController::class, 'update'])->name('messages.update');
        Route::delete('/messages/{message}', [MessageController::class, 'destroy'])->name('messages.delete');
        Route::post('/messages/{message}/reactions', [ReactionController::class, 'toggle'])->name('reactions.toggle');
        Route::post('/rooms/{room}/typing', [TypingController::class, 'store'])->name('typing.set');
        Route::post('/rooms/{room}/invites', [InviteController::class, 'store'])
            ->middleware('throttle:chat-invites')
            ->name('invites.create');
        Route::delete('/invites/{invite}', [InviteController::class, 'destroy'])->name('invites.revoke');

        Route::get('/search/messages', [SearchController::class, 'index'])->name('search.messages');
        Route::post('/rooms/{room}/read', [MessageController::class, 'markRead'])->name('messages.read');
    });

// Сведения о приглашении нужны до входа: по ним человек решает, идти ли.
Route::prefix(config('chat.routes.prefix', 'api/v1'))
    ->middleware([...config('chat.routes.middleware', ['api']), 'throttle:chat-invite-lookup'])
    ->name('chat.')
    ->group(function (): void {
        Route::get('/invites/{token}', [InviteController::class, 'show'])->name('invites.show');
    });
