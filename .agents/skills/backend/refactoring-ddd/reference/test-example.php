<?php

use App\Domain\User\Models\User;
use App\Domain\User\Handlers\UpdateUserHandler;
use App\Domain\User\Commands\UpdateUserCommand;
use App\Domain\User\DTO\UpdateProfileDTO;

/**
 * Пример теста на Handler с использованием Pest.
 */
it('updates user profile correctly via handler', function () {
    // Arrange
    $user = User::factory()->create([
        'name' => 'Old Name',
        'email' => 'old@example.com'
    ]);

    $dto = new UpdateProfileDTO(
        name: 'New Name',
        email: 'new@example.com',
        settings: ['theme' => 'dark']
    );

    $command = new UpdateUserCommand($user->id, $dto);
    $handler = new UpdateUserHandler();

    // Act
    $updatedUser = $handler->handle($command);

    // Assert
    expect($updatedUser->name)->toBe('New Name')
        ->and($updatedUser->email)->toBe('new@example.com')
        ->and($updatedUser->settings)->toBe(['theme' => 'dark']);
        
    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'name' => 'New Name'
    ]);
});
