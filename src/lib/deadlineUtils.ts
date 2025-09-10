// Simple utility to check if we're past a deadline
export function isPastDeadline(deadline: string | null): boolean {
  if (!deadline) return false;

  const now = new Date();
  const deadlineDate = new Date(deadline);

  return now > deadlineDate;
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
