import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip';

function formatRelativeTime(date) {
  const diff = Date.now() - date.getTime();
  const abs = Math.abs(diff);
  const past = diff > 0;

  const s = Math.floor(abs / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const mo = Math.floor(d / 30);
  const y = Math.floor(d / 365);

  let value, unit;
  if (y > 0) { value = y; unit = 'year'; }
  else if (mo > 0) { value = mo; unit = 'month'; }
  else if (d > 0) { value = d; unit = 'day'; }
  else if (h > 0) { value = h; unit = 'hour'; }
  else if (m > 0) { value = m; unit = 'minute'; }
  else { value = s; unit = 'second'; }

  const plural = value !== 1 ? 's' : '';
  return past ? `${value} ${unit}${plural} ago` : `in ${value} ${unit}${plural}`;
}

function formatTimestamp(date, style) {
  switch (style) {
    case 'RelativeTime':
      return formatRelativeTime(date);
    case 'LongTime':
      return date.toLocaleTimeString();
    case 'ShortTime':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case 'ShortDate':
      return date.toLocaleDateString();
    case 'LongDate':
      return date.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
    case 'ShortDateTime':
      return date.toLocaleString([], {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    case 'LongDateTime':
      return date.toLocaleString([], {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    default:
      return date.toLocaleString();
  }
}

const TimestampDisplay = ({ timestamp, style }) => {
  const date = new Date(timestamp * 1000);
  const formatted = formatTimestamp(date, style);
  const fullDate = date.toLocaleString([], {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default rounded bg-gray-700/50 px-1 py-0.5 text-sm">
          {formatted}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{fullDate}</TooltipContent>
    </Tooltip>
  );
};

export default TimestampDisplay;
