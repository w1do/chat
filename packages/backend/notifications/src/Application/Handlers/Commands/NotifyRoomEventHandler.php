<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Handlers\Commands;

use Illuminate\Contracts\Bus\Dispatcher as BusDispatcher;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Vendor\Notifications\Application\Commands\NotifyRoomEventCommand;
use Vendor\Notifications\Domain\Contracts\ActivityInspector;
use Vendor\Notifications\Domain\Contracts\PreferenceResolver;
use Vendor\Notifications\Domain\Enums\Channel;
use Vendor\Notifications\Infrastructure\Jobs\DeliverNotificationJob;

/**
 * Кому и как сообщить о событии комнаты.
 *
 * Правила (spec): инициатор себя не уведомляет; активный в комнате получатель
 * не получает «догоняющее» уведомление; шумные события группируются в одну
 * запись внутри окна; медленные каналы уходят в очередь.
 */
final readonly class NotifyRoomEventHandler
{
    public function __construct(
        private PreferenceResolver $preferences,
        private ActivityInspector $activity,
        private BusDispatcher $bus,
        private Repository $config,
    ) {}

    /** @return list<string> идентификаторы созданных или обновлённых записей */
    public function handle(NotifyRoomEventCommand $command): array
    {
        $touched = [];

        foreach (array_unique($command->recipientIds) as $recipientId) {
            // Инициатор не получает уведомление о собственном действии.
            if ($recipientId === $command->actorId) {
                continue;
            }

            // Активный в комнате уже всё видит.
            if ($this->activity->isActiveIn($command->roomId, $recipientId)) {
                continue;
            }

            $channels = $this->preferences->channelsFor($recipientId, $command->category);

            if (! in_array(Channel::Database, $channels, true)) {
                // Лента выключена — почтовые каналы всё равно обрабатываются ниже.
                $notificationId = null;
            } else {
                $notificationId = $this->storeOrGroup($command, $recipientId);
                $touched[] = $notificationId;
            }

            foreach ($channels as $channel) {
                if ($channel === Channel::Database) {
                    continue;
                }

                // Медленные каналы — только через очередь и идемпотентно.
                $this->bus->dispatch(
                    (new DeliverNotificationJob(
                        recipientId: $recipientId,
                        category: $command->category,
                        channel: $channel,
                        payload: $this->payload($command),
                        notificationId: $notificationId,
                    ))->onQueue($command->category->queue()),
                );
            }
        }

        return $touched;
    }

    private function storeOrGroup(NotifyRoomEventCommand $command, string $recipientId): string
    {
        $groupKey = "{$command->category->value}:{$command->roomId}";
        $window = (int) $this->config->get("notifications.grouping.{$command->category->value}", 0);

        $existing = $window > 0
            ? DB::table('notifications')
                ->where('notifiable_id', $recipientId)
                ->where('group_key', $groupKey)
                ->whereNull('read_at')
                ->where('created_at', '>=', Carbon::now()->subSeconds($window))
                ->orderByDesc('created_at')
                ->first()
            : null;

        if ($existing !== null) {
            // Шумную комнату не размножаем: обновляем ту же запись.
            $data = json_decode((string) $existing->data, true);
            $data['preview'] = $command->preview;
            $data['actor_name'] = $command->actorName;
            $data['message_id'] = $command->messageId;

            DB::table('notifications')
                ->where('id', $existing->id)
                ->update([
                    'data' => json_encode($data, JSON_UNESCAPED_UNICODE),
                    'group_count' => $existing->group_count + 1,
                    'updated_at' => Carbon::now(),
                ]);

            return (string) $existing->id;
        }

        $id = (string) Str::uuid();

        DB::table('notifications')->insert([
            'id' => $id,
            'type' => 'chat.'.$command->category->value,
            'notifiable_type' => 'user',
            'notifiable_id' => $recipientId,
            'data' => json_encode($this->payload($command), JSON_UNESCAPED_UNICODE),
            'group_key' => $groupKey,
            'group_count' => 1,
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        return $id;
    }

    /** @return array<string, mixed> */
    private function payload(NotifyRoomEventCommand $command): array
    {
        return [
            'category' => $command->category->value,
            'room_id' => $command->roomId,
            'room_name' => $command->roomName,
            'actor_id' => $command->actorId,
            'actor_name' => $command->actorName,
            'message_id' => $command->messageId,
            'preview' => $command->preview,
        ];
    }
}
