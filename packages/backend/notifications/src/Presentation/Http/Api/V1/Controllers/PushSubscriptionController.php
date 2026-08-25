<?php

declare(strict_types=1);

namespace Vendor\Notifications\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Vendor\Notifications\Application\Commands\SubscribeDeviceCommand;
use Vendor\Notifications\Application\Commands\UnsubscribeDeviceCommand;
use Vendor\Notifications\Application\Handlers\Commands\SubscribeDeviceHandler;
use Vendor\Notifications\Application\Handlers\Commands\UnsubscribeDeviceHandler;
use Vendor\Notifications\Presentation\Http\Api\V1\Requests\SubscribeDeviceRequest;
use Vendor\Notifications\Presentation\Http\Api\V1\Requests\UnsubscribeDeviceRequest;

/** Подписки устройств на Web Push: одна запись на устройство. */
final class PushSubscriptionController
{
    public function store(SubscribeDeviceRequest $request, SubscribeDeviceHandler $handler): JsonResponse
    {
        $input = $request->validated();

        $subscription = $handler->handle(new SubscribeDeviceCommand(
            userId: (string) $request->user()->getAuthIdentifier(),
            endpoint: (string) $input['endpoint'],
            p256dh: (string) $input['keys']['p256dh'],
            auth: (string) $input['keys']['auth'],
            userAgent: $request->userAgent(),
        ));

        return new JsonResponse(['data' => ['id' => $subscription->id]], 201);
    }

    public function destroy(UnsubscribeDeviceRequest $request, UnsubscribeDeviceHandler $handler): Response
    {
        $handler->handle(new UnsubscribeDeviceCommand(
            userId: (string) $request->user()->getAuthIdentifier(),
            endpoint: (string) $request->validated()['endpoint'],
        ));

        // 204 и когда подписки не было: результат один — её нет.
        return response()->noContent();
    }
}
