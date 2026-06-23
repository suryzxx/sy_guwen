# Planner SQLite API

Run the SQLite API and frontend in two terminals:

```bash
npm run server
npm run dev
```

The database is created at `server/data/app.sqlite` and seeded automatically.

Development login uses the seeded planner. To test automatic mapping, add any
of these query parameters to the frontend URL:

```text
?userid=demo_planner
?mobile=18756093437
?unionid=demo_unionid
```

For real WeCom OAuth, configure `WECOM_CORP_ID`, `WECOM_AGENT_ID` and
`WECOM_CORP_SECRET`, then call `/wecom/oauth-url` before `/wecom/login`.

## WeCom sidebar contact

The sidebar flow resolves the current external contact through WeCom JS-SDK:

```text
getCurExternalContact -> external_userid -> /wecom/external-contact/resolve -> student
```

For local debugging without WeCom, pass both ids in the URL:

```text
?userid=ZhuXiuXia&external_userid=debug_external_yizhizhu
```

Manual prototype binding uses:

```http
POST /wecom/external-contact/bind
{ "externalUserid": "...", "studentId": "s_external_001", "displayName": "一只猪" }
```

## Student workflow

Student progress uses the shared stage definitions in
`shared/student-workflow.js`. Do not add page-specific status fields.

The API exposes these workflow operations:

- `PATCH /planner/students/:id/stage` advances a student through a validated transition.
- `PATCH /planner/students/:id/evaluation` saves the evaluation level and result.
- `PATCH /planner/tasks/:id/complete` completes a generated task.
- `GET /planner/students/:id` returns the student, tasks, stage history, and records.

Student stages are grouped as `lead_resource`, `assessment`, and `enrolled`.
Order state stays on the order record; creating or pushing an order no longer
changes the student's main stage. Completing evaluation can move a student into
`adapted_not_converted` or `not_adapted`. Payment or class-entry events should
move the student into `enrolled_student`.
