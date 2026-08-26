CREATE TABLE `doses` (
	`id` text PRIMARY KEY NOT NULL,
	`esquema_id` text NOT NULL,
	`data_hora_prevista` integer,
	`status` text DEFAULT 'pendente' NOT NULL,
	`data_hora_registro` integer,
	`notificacoes_sem_resposta` integer DEFAULT 0 NOT NULL,
	`numero_no_ciclo` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`esquema_id`) REFERENCES `esquemas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `esquemas` (
	`id` text PRIMARY KEY NOT NULL,
	`medicamento_id` text NOT NULL,
	`tipo` text NOT NULL,
	`horarios` text,
	`intervalo_horas` integer,
	`dias_da_semana` text,
	`dias_ativos` integer,
	`dias_pausa` integer,
	`data_inicio_ciclo` integer,
	`duracao_dias` integer,
	`limite_diario` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `medicamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`dosagem` text NOT NULL,
	`criticidade` text NOT NULL,
	`quantidade_em_estoque` integer DEFAULT 0 NOT NULL,
	`quantidade_por_embalagem` integer NOT NULL,
	`notificacoes_ativas` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
