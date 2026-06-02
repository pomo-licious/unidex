// ─────────────────────────────────────────────────────────────────────────────
// src/lib/notificationHelpers.mjs — Notification creation helpers
//
// Creates reminder notifications for upcoming college deadlines
// ─────────────────────────────────────────────────────────────────────────────

export async function createDeadlineNotifications(supabase, studentId, collegeId) {
  try {
    // Get college with deadlines
    const { data: college } = await supabase
      .from('colleges')
      .select('deadlines')
      .eq('id', collegeId)
      .single()

    if (!college?.deadlines || college.deadlines.length === 0) return

    // Find nearest future deadline
    const today = new Date()
    const futureDeadlines = college.deadlines
      .filter(d => new Date(d.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    if (futureDeadlines.length === 0) return

    const nearestDeadline = futureDeadlines[0]
    const deadlineDate = new Date(nearestDeadline.date)

    // Create notifications at 7, 3, and 1 day before
    const remindDays = [7, 3, 1]
    const notifications = []

    for (const days of remindDays) {
      const notifyDate = new Date(deadlineDate)
      notifyDate.setDate(notifyDate.getDate() - days)

      if (notifyDate >= today) {
        const daysText = days === 1 ? 'Tomorrow' : `${days} days`
        const message = `${daysText} is ${college.name} ${nearestDeadline.round} deadline`

        notifications.push({
          student_id: studentId,
          college_id: collegeId,
          type: 'deadline',
          message,
          due_date: notifyDate.toISOString().split('T')[0],
          sent: false,
        })
      }
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }
  } catch (err) {
    console.error('Failed to create notifications:', err)
  }
}
