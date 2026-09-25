/**
 * Utilitários para sincronização de calendário e geração de feed iCal (.ics)
 * Compatível com Google Calendar, Apple Calendar, Microsoft Outlook.
 */

interface CalendarTask {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  startDate?: Date | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  assignedTo?: { name: string; email: string } | null;
  project?: { name: string } | null;
}

function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Gera um arquivo iCal padrão (RFC 5545) compatível com qualquer aplicativo de calendário.
 */
export function generateICSFeed(
  tasks: CalendarTask[],
  orgName: string = 'Rocket Club'
): string {
  const now = new Date();
  const dtstamp = formatDateToICS(now);

  const events = tasks
    .filter((task) => task.dueDate)
    .map((task) => {
      const due = new Date(task.dueDate!);
      const start = task.startDate ? new Date(task.startDate) : new Date(due.getTime() - 60 * 60 * 1000); // 1h antes por padrão
      
      const priorityLabel =
        task.priority === 'URGENTE'
          ? '🔴 [URGENTE]'
          : task.priority === 'ALTA'
          ? '🟠 [ALTA]'
          : task.priority === 'MEDIA'
          ? '🟡 [MÉDIA]'
          : '🟢 [BAIXA]';

      const summary = `${priorityLabel} ${task.title}`;
      const projectName = task.project?.name ? `Projeto: ${task.project.name}\n` : '';
      const assigneeName = task.assignedTo?.name ? `Responsável: ${task.assignedTo.name} (${task.assignedTo.email})\n` : '';
      const statusText = task.completedAt ? 'Status: CONCLUÍDA\n' : 'Status: PENDENTE\n';
      
      const rawDesc = `${projectName}${assigneeName}${statusText}\n${task.description || ''}`.trim();
      // Sanitização de quebra de linhas para RFC 5545
      const description = rawDesc.replace(/\n/g, '\\n');

      return [
        'BEGIN:VEVENT',
        `UID:rocket-task-${task.id}@rocketclub.com`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${formatDateToICS(start)}`,
        `DTEND:${formatDateToICS(due)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        task.completedAt ? 'STATUS:COMPLETED' : 'STATUS:CONFIRMED',
        'CATEGORIES:Rocket Club,Tarefas,Equipe',
        'END:VEVENT',
      ].join('\r\n');
    });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rocket Club//Rocket Tasks//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${orgName} - Tarefas & Prazos`,
    'X-WR-TIMEZONE:America/Sao_Paulo',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}
