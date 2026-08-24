<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Queries;

use Vendor\Identity\Application\DTOs\UserData;
use Vendor\Identity\Application\Queries\GetMeQuery;
use Vendor\Identity\Infrastructure\Auth\UserModel;

final readonly class GetMeHandler
{
    public function __construct(private UserModel $userModel) {}

    public function handle(GetMeQuery $query): UserData
    {
        return UserData::fromModel($this->userModel->findOrFail($query->userId));
    }
}
