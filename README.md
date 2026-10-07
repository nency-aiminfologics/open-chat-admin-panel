# Admin Panel (Next.js + Tailwind CSS)

## Run

```bash
npm install
npm run dev     # http://localhost:3000
```

Demo login: `admin@example.com` / `admin123`

## Modules

| Route | What the admin can do |
| --- | --- |
| `/login` | Admin authentication (route guard on all other pages) |
| `/users`, `/users/[id]` | Search users, view position, interests, skills, uploaded videos, Instagram / Facebook / LinkedIn links; suspend / restore |
| `/identity` | View identity documents; set status pending / verified / rejected (reason required on reject) |
| `/skill-verification` | Review each skill's document, link and video (3 reviews), then set status; reason required on reject |
| `/catalogue` | Add / edit / delete skills and interests (rename syncs to user profiles) |
| `/reports` | See reported and blocked users with the report reason; suspend from a report |
| `/support` | View tickets, reply, create a ticket for a user, change ticket status |
| `/faqs`, `/policies` | Create / edit / delete title + description content |

## Structure

- `lib/data.js` – seed data
- `lib/store.js` – React context store (persists to localStorage). Replace the actions with API calls for a real backend.
- `components/` – Sidebar, shared UI (Badge, Modal, StatusChanger, Tabs)
- `app/(admin)/*` – guarded admin pages
