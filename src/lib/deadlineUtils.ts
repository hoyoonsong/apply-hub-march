// Simple utility to check if we're past a deadline
export function isPastDeadline(deadline: string | null): boolean {
  if (!deadline) return false;

  const now = new Date();
  const deadlineDate = new Date(deadline);

  return now > deadlineDate;
}

// Check if application opens in the future
export function isBeforeOpenDate(openDate: string | null): boolean {
  if (!openDate) return false;

  const now = new Date();
  const openDateObj = new Date(openDate);

  return now < openDateObj;
}

// Check if application is currently open (between open and close dates)
export function isApplicationOpen(
  openDate: string | null,
  closeDate: string | null
): boolean {
  const now = new Date();
  const open = openDate ? new Date(openDate) : null;
  const close = closeDate ? new Date(closeDate) : null;

  // If no open date, consider it always open (backward compatibility)
  if (!open) return !isPastDeadline(closeDate);

  // If no close date, consider it open if past open date
  if (!close) return now >= open;

  // Check if we're between open and close dates
  return now >= open && now <= close;
}

export function getDeadlineMessage(deadline: string | null): string {
  if (!deadline) return "No deadline set";

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return "Deadline passed";
  } else if (diffDays === 1) {
    return "Deadline tomorrow";
  } else if (diffDays <= 7) {
    return `Deadline in ${diffDays} days`;
  } else {
    return `Deadline: ${deadlineDate.toLocaleDateString()}`;
  }
}

export function getOpenDateMessage(openDate: string | null): string {
  if (!openDate) return "No open date set";

  const now = new Date();
  const openDateObj = new Date(openDate);
  const diffMs = openDateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return "Application is open";
  } else if (diffDays === 1) {
    return "Opens tomorrow";
  } else if (diffDays <= 7) {
    return `Opens in ${diffDays} days`;
  } else {
    return `Opens: ${openDateObj.toLocaleDateString()}`;
  }
}
