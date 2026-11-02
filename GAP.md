# Gap against main (`5618074`)

Checked before the M2 code. This file covers settlement (item 5) and tasks by side plus My Tasks (item 3) only.

## Item 5 — Settlement remainder

### Already on main

- INR budget is split 50/50. `splitRupees` in `src/lib/planning.ts` gives the extra ₹1 to the bride (`ODD_RUPEE_SIDE` in `src/config/budgetRules.ts`). The groom's share is the remainder, so the two shares add up to the whole-rupee total. The same split is used for the category card line in `src/lib/rollup.ts`.
- `familySettlement` reads the payment rows once. Bride-side and groom-side payments add into that side's paid total. A payment with no bride or groom side, including `paid_by_side` blank or `other`, is unattributed.
- A row whose note or payer is `Earlier spend (migrated)` makes that category use the payment sum only. `budget_items.actual` is not added on top of those payments. Where there is no migrated row and `actual` is still above the payments, only the gap is unattributed, so the payment itself is not counted twice.
- Who owes whom is the 50/50 of the sided payments, again with the odd rupee to the bride. The sentence is `Groom's family owes bride's family ₹N.` or the reverse, or that the two families are settled. Amounts are whole rupees. There is no control that marks a settlement as paid.
- Parents may insert a payment only when `budget.pay` is `own_side` and `paid_by_side` is their side (`payments_insert_by_permission`). Planners have `budget.view` all, `budget.edit` none, and `budget.pay` none. Friends have `budget.view` none, so `budget_items` and `part_payments` return no rows. Task-cost reads also require `budget.view` all.
- Non-INR rows are skipped by `familySettlement` and by the INR rollup. Each such card carries `Not in total: …`, and the Budget screen prints those notes.

### Still missing

- The Record payment sheet still offers Bride's side, Groom's side, Other, and Not specified to a parent. The database rejects the other side. The sheet does not limit a parent to their own side.
- There is no separate whole-rupee "net settled" figure. The screen shows the two budget shares, the two paid totals, unattributed spend, and the owes sentence.
- The owes sentence names "Groom's family" and "bride's family". It is not a short `X owes Y ₹N` line next to a net settled amount.
- An odd sided-payment total uses the same split helper, and there is no test that those two responsibility shares add back to that payment total, or that a displayed net settled amount is a whole number of rupees.

## Item 3 — Tasks by side and My Tasks

### Already on main

- The permissions matrix gives the couple and the planner `tasks.view` and `tasks.edit` of `all`. Family may view every task and edit `own_side`. A friend may view and edit only `assigned` (`20261026180000_permissions.sql`).
- `tasks_select_by_permission`, `tasks_insert_by_permission`, `tasks_update_by_permission`, and `tasks_delete_by_permission` enforce that matrix.
- `protect_task_update` blocks a parent from changing a task whose old or new side is not their side, and blocks assigning someone who is not on that side. A friend may change only the status of a task already assigned to them.
- The task screen's assignee list uses `assignableMembers`: a parent sees people on their side; the couple and the planner see everyone; a friend sees no one.
- Unassigned tasks that already have a side are grouped as `Unassigned · Bride's side` or `Unassigned · Groom's side` (`unassignedSideGroups`). A parent sees only their side's group. The couple and the planner see both.
- `release_member_tasks`, called from `leave_wedding` and `remove_wedding_member`, clears `assigned_to`. When the member's side is bride or groom, the task's side is set to that side. Clients cannot call `release_member_tasks` directly. The role tests cover leave and remove.
- `subscribeWeddingChecklist` listens to `tasks` and `wedding_functions`, so an assignment or status change can reach an open Planning screen without a reload.
- A friend does not see the rupee chip, because `canSeeBudget` is false for that role. The planner can see costs and cannot edit them while `PLANNER_CAN_EDIT_TASK_COSTS` is false.

### Still missing

- There is no My Tasks list. Nothing filters the open wedding to exactly the tasks whose `assigned_to` is the signed-in member, for every role.
- A friend's task card still shows the category badge. The spec for this item says a friend sees no cost and no category.
- Assigned tasks stay under their function. They are not also grouped by side. Only unassigned, side-tagged tasks get a side heading.
- A parent can still read the other side's tasks, because `tasks.view` for family is `all`. Editing that other side is already refused. This item does not require hiding those rows on the Tasks screen; Home (item 2) is the place that must hide the other side.
