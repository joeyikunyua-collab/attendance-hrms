# Attendance & HRMS — User Guide

A plain-language guide to using the Attendance & HR Management System. No technical knowledge required.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Understanding Your Role](#2-understanding-your-role)
3. [Dashboard (Home Page)](#3-dashboard-home-page)
4. [Attendance](#4-attendance)
5. [Requests (Leave / Time Off)](#5-requests-leave--time-off)
6. [Employees (Admin Only)](#6-employees-admin-only)
7. [Reports](#7-reports)
8. [Login Activity (Admin Only)](#8-login-activity-admin-only)
9. [Settings (Admin Only)](#9-settings-admin-only)
10. [Announcements](#10-announcements)
11. [Celebrations](#11-celebrations)
12. [My Profile](#12-my-profile)
13. [Notifications](#13-notifications)
14. [Glossary](#14-glossary)
15. [Frequently Asked Questions](#15-frequently-asked-questions)

---

## 1. Getting Started

### Logging In

You'll be given a **username** and a **temporary password** by your HR administrator. Use these to log in for the first time.

> **First login:** The system will require you to set a new password before you can do anything else. This screen cannot be skipped — you must choose a new password to continue.

### The Header Bar

No matter which page you're on, you'll always see a bar at the top with:

- **Company logo/name** (top-left) — click it to return to the Dashboard.
- **🔔 Notification bell** (top-right) — see [Notifications](#13-notifications).
- **Profile menu** (top-right) — click your name/avatar to:
  - View My Profile
  - Account Settings (change your password)
  - Log Out

---

## 2. Understanding Your Role

The system has two types of accounts:

| Role | Who they are |
|---|---|
| **Staff** | Regular employees. Can manage their own attendance and leave requests. |
| **Admin** | HR/management. Can manage everyone's attendance, employees, leave requests, and system settings. |

There's also a third, informal concept:

> **Manager** is not a separate account type — it's just *anyone* (Staff or Admin) who has been listed as another employee's "Direct Manager." If people report to you, you automatically get an approvals queue for their leave requests, even if your account type is "Staff."

### What each role can see

| Menu Tab | Staff sees | Admin sees |
|---|---|---|
| Dashboard | ✅ (personal view) | ✅ (company-wide view) |
| Attendance | ✅ "My Attendance" only | ✅ Full company Attendance Dashboard |
| Requests | ✅ own requests (+ approvals if a manager) | ✅ everyone's requests |
| Employees | ❌ | ✅ |
| Reports | ✅ "My History" only | ✅ Full company reports |
| Login Activity | ❌ | ✅ |
| Settings | ❌ | ✅ |

---

## 3. Dashboard (Home Page)

This is the first thing you see after logging in. Its content depends on your role.

### If you're Staff

- A welcome card showing whether you've **checked in** and **checked out** today, plus a live "time at work" counter and a shortcut button to go to My Attendance.
- The **company Announcements** feed.
- The **Celebrations** widget (birthdays and work anniversaries).
- Three quick stats: time at work today, days present this week, hours worked this week.

### If you're Admin

- **Announcements** and **Celebrations**, same as above.
- Three company-wide stats: Active Employees, Checked In Today, Not Yet Checked In.
- An **attendance trends chart**.
- A **"Time at Work" weekly grid** — one row per employee, one column per day, showing how many hours each person worked. Use the **Prev week / This week / Next week** buttons (or the date pickers) to browse other weeks. Click any employee's name to see a day-by-day breakdown.

---

## 4. Attendance

### If you're Staff — "My Attendance"

- A card shows today's date and your check-in/check-out times.
- **Check In** button (green) — tap it to record your arrival. This requires your browser to share your location, so make sure **Location access** is allowed for the site (if it's blocked, the system will tell you how to fix it in your browser settings).
- Once you've checked in, the button changes to **Check Out** (amber). After checking out, it shows "Done for today."
- You can only check yourself in once per day, and only for yourself — not on behalf of anyone else.
- Use the **List / Calendar** toggle to switch between today's card and a full month calendar. In Calendar view, days are color-coded: 🟢 green = Present, 🔴 red = Absent. Click any day to see the exact times.

### If you're Admin — "Attendance Dashboard"

A company-wide view of everyone's attendance.

- A live status indicator shows whether the system is running normally.
- Four key numbers at the top: **Active Employees**, **Checked In Today**, **Not Checked In** (with a **"Nudge All"** button to send a reminder notification to everyone who hasn't checked in yet), and **Requires Action** (people missing a checkout).
- Three view modes:
  - **Weekly Summary** — hours worked per employee, per day, for the week.
  - **Detailed Time Logs** — exact check-in/check-out timestamps, with a date range filter.
  - **Exception Queue** — only employees with a problem today (missing checkout, absence, or overtime).
- **Search** by name/ID and **filter by Department**.
- **Export CSV** — download the current view as a spreadsheet file.
- **Manual Time Entry** — create or fix an attendance record for any employee on any date (useful if someone forgot to check in, or you need to correct a mistake).
- Click any row to open the **Audit Drawer**, which shows exact check-in/out times, the IP address, and a map of where the check-in/out happened. Admins can add a note and click **"Approve & Resolve Exception"** to mark a problem as reviewed (this doesn't change the recorded times — it just confirms someone looked at it).
- A **List/Calendar toggle** also exists here, showing daily present/absent counts company-wide.

### Things to know

- Overtime is automatically flagged when someone's shift is longer than the threshold set in Settings.
- Status labels you'll see: **PRESENT**, **INCOMPLETE** (checked in but never checked out), **ABSENT**, **LATE**, **OVERTIME**.

---

## 5. Requests (Leave / Time Off)

This page is where leave (vacation, sick days, etc.) is requested and approved. What you see here depends on your role and relationships:

| Section | Who sees it |
|---|---|
| **My Requests** | Everyone — your own leave request history. |
| **My Approvals** | Anyone who manages other people (their direct reports' pending requests appear here for you to approve/reject). |
| **Team Requests** | Admins only — every request in the company. |

### Submitting a Leave Request

1. Click **New Request** (or, if you're an admin filing on someone's behalf, **Submit for Employee**).
2. Fill in:
   - **Employee** (admin only, if submitting for someone else)
   - **Type** — pick from the leave types your company has configured (e.g., Annual Leave, Sick Leave)
   - **Start date** and **End date** — the total number of days is calculated automatically
   - **Reason** (optional)
3. The form shows how many days of that leave type you have left this year (or "Unlimited" if that type has no cap). If your request would use more days than you have, you'll see a warning.
4. Click **Submit Request**.

> If no leave types appear in the dropdown, ask your admin to add some under Settings first.

### Reviewing a Request (Approving/Rejecting)

Click any request to open its details: employee, leave type, dates, number of days, reason, and current status.

- If it's still pending, you can add an optional note and click **Approve** or **Reject**.
- You can **Cancel** your own pending requests from My Requests (click the ✕ icon), with a confirmation prompt.

### How approvals work

Your company sets one of three approval flows in Settings:

- **Admin only** — any admin approves or rejects.
- **Manager only** — the employee's direct manager decides.
- **Manager, then admin** — the manager approves first, then an admin gives final sign-off.

A few important rules:

- If a flow requires a manager but the employee doesn't have one assigned, it automatically goes to an admin instead.
- **Admins can always step in** and approve/reject a request at any stage, even if it's technically "waiting" on someone else — this prevents requests from getting stuck.
- If an employee's manager changes while a request is waiting on the old manager, the request automatically moves to the new manager (or to an admin, if there isn't one).
- You'll get a notification whenever a request needs your review, and whenever your own request is approved, rejected, or moves to the next stage.

---

## 6. Employees (Admin Only)

The company's employee directory — add, edit, and manage everyone's records and access.

### Top stats

**Total Employees**, **Active Staff**, **Departments**, and **Pending Onboarding** (employees who haven't set their own password yet).

### Adding an Employee

Click **Add Employee** and fill in three sections:

1. **Personal Information** — First/Middle/Last name, Work email, Date of birth.
2. **Organizational Details** — Employee ID (auto-generated), Hire date, Department, Job title, Office location, Direct manager.
3. **Access & Account Security** — System role (Staff or Admin), Employment type.

When you save, a green banner shows the new employee's **username** and **temporary password** — share these with them so they can log in for the first time. Their account will show as "Pending Onboarding" until they set their own password.

### Managing Existing Employees

- **Search** by name/email/ID, and **filter** by Department or Status (Active / Pending Onboarding / Inactive / Suspended).
- Click a row to open the **Profile Drawer**, where you can edit Department, Job title, System role, Direct manager, and Account status.
  - Setting someone to **Inactive** or **Suspended** immediately logs them out of any active session.
- Use the **•••** menu on a row for **Edit profile** or **Delete** (deleting is permanent and requires confirmation).
- **Export Roster** downloads the full employee list as a spreadsheet.

### Good to know

- You can't make someone their own manager, and the system blocks circular reporting chains (e.g., A manages B, B manages A).
- Deleting an employee also removes their login, clears them as anyone's manager, and reroutes any leave requests that were waiting on them.
- Two employees can't share the same work email.

---

## 7. Reports

Called **"My History"** if you're Staff (showing only your own records), or **Reports** if you're Admin (showing everyone's).

- Four summary numbers: Total Shift Records, Completion Rate, Logged Overtime, Flagged Exceptions.
- Filter by status (Completed / Missing Check-out / Overtime) and by date range.
- Admins also get a **Search**, **Department filter**, and analytics chart.
- A table lists each shift: Date, Employee, Check-In, Check-Out, Total Duration, and a compliance badge. Click **Inspect Logs** for full details (map, IP, etc.).
- **Export CSV** and **Export PDF** buttons let you download the data.
- Admins can click **Schedule Automatic Delivery** to set up a recurring report (Daily/Weekly/Monthly, as PDF or CSV, sent to a list of email addresses).

  > Note: this saves your preference, but actually emailing the reports requires your IT team to configure email sending separately — nothing is sent automatically until that's done.

---

## 8. Login Activity (Admin Only)

A simple log of every login to the system: who logged in, their role, the exact time, and (if available) a map link showing where they logged in from.

---

## 9. Settings (Admin Only)

Changes here apply to the **entire system immediately**. Sections include:

- **Branding** — Company logo and name (shown in the header and login screen).
- **Attendance rules** — the overtime threshold (in hours) and which days count as weekends.
- **Check-in reminders** — the time window during which staff who haven't checked in receive a reminder.
- **Onboarding & security** — the default password given to new employees, and the minimum password length required for everyone.
- **Office locations** — list of company locations, used as a dropdown when adding employees.
- **Departments** — list of departments, used the same way.
- **Employment types** — e.g., Full-time, Part-time, Contract.
- **Announcement categories** — categories available when posting an announcement.
- **Leave types & annual balances** — the list of leave types employees can request (name, days per year — leave blank for unlimited, and whether it's paid).
- **Leave approval flow** — choose Admin only, Manager only, or Manager then admin (see [Requests](#5-requests-leave--time-off)).

Click **Save Changes** at the bottom to apply everything at once. If something's invalid (like an empty leave type name), you'll get an error message and the save will be blocked until it's fixed.

---

## 10. Announcements

Shown on the Dashboard for everyone to read.

- **Admins** can click **Post Announcement** to create one — Title, Message, Category, and an option to **Pin to top of feed** so it stays visible.
- Admins can delete announcements (hover to find the trash icon), with a confirmation prompt.
- Long posts show a **Read More** link to view the full text.

---

## 11. Celebrations

Also on the Dashboard — shows employees with a birthday or work anniversary, split into **Today** and **Upcoming** (next 14 days) tabs.

Click the message icon next to someone's name to **send them a wish** — a pre-filled message you can edit before sending. They'll get a notification.

---

## 12. My Profile

View your own details: name, job title, status, Employee ID, work email, department, employment type, hire date, date of birth, office location, and direct manager. This page is read-only — to change your password, use **Account Settings** in the profile menu.

---

## 13. Notifications

Click the 🔔 bell icon in the header to see recent notifications — things like new leave requests needing your review, approvals/rejections on your own requests, check-in reminders, announcements, and birthday/anniversary wishes. Unread notifications are marked with a count badge; click **Mark all as read** to clear them.

---

## 14. Glossary

| Term | Meaning |
|---|---|
| **Admin** | Full-access account type — manages employees, attendance, requests, and settings for the whole company. |
| **Staff** | Standard account type — manages only their own attendance and requests. |
| **Manager** | Not an account type — any employee listed as someone else's "Direct Manager." Gets an approvals queue for that person's leave requests. |
| **Pending Onboarding** | An employee has been added but hasn't logged in and set their own password yet. |
| **Active** | A normal, currently employed staff member. |
| **Inactive / Suspended** | Access has been removed or paused; any active login session ends immediately. |
| **PRESENT / LATE / ABSENT / INCOMPLETE / OVERTIME** | Attendance status labels — INCOMPLETE means checked in but never checked out; OVERTIME means the shift ran longer than the configured threshold. |
| **PENDING / APPROVED / REJECTED / CANCELLED** | Leave request status labels. |
| **Leave type** | A category of time off (e.g., Annual Leave, Sick Leave), each with its own yearly day limit (or unlimited) and paid/unpaid status. |
| **Leave balance** | How many days of a leave type you've used vs. have left this calendar year. |
| **Leave approval flow** | The company's policy on who must approve leave requests: Admin only, Manager only, or Manager then admin. |
| **Overtime threshold** | The shift length (in hours) beyond which a shift is flagged as overtime — set in Settings. |
| **Weekend days** | The days of the week configured as non-working days. |
| **Audit note / Resolve exception** | An admin's note confirming they've reviewed an attendance issue (like a missing checkout) — it doesn't change the recorded times. |
| **Manual time entry** | An admin creating or correcting someone's attendance record by hand. |

---

## 15. Frequently Asked Questions

**I can't check in — it says location access is blocked. What do I do?**
Your browser needs permission to share your location for this site. Look for a lock/site-settings icon in your browser's address bar, open it, and set Location to "Allow," then try again.

**Why can't I select a leave type when submitting a request?**
No leave types have been configured yet. Ask your admin to add at least one under Settings → Leave types & annual balances.

**I submitted a leave request — who approves it?**
Depends on your company's configured approval flow (Settings → Leave approval flow): your direct manager, an admin, or both in sequence. You'll be notified at each step.

**Can I edit or delete a leave request after submitting it?**
You can **cancel** it yourself while it's still Pending. Once it's Approved or Rejected, it can no longer be changed by you — contact an admin.

**I forgot to check in/out — can I fix it?**
You can't edit your own attendance record. Ask an admin to use **Manual Time Entry** to correct it.

**How do I change my password?**
Open the profile menu (top-right) → **Account Settings**.

**What happens if I'm marked Inactive or Suspended?**
You'll be logged out immediately and won't be able to log back in until an admin reactivates your account.
