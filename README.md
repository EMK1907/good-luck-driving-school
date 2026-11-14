# Good Luck Driving School

The live website for a 3-instructor driving school in London, with a private dashboard where instructors manage the site themselves.

**Live site: [goodluckmehmetdrivingschool.co.uk](https://goodluckmehmetdrivingschool.co.uk)**

![HTML](https://img.shields.io/badge/HTML-E34F26?logo=html5&logoColor=white) ![CSS](https://img.shields.io/badge/CSS-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black) ![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white) ![Netlify](https://img.shields.io/badge/Netlify-00C7B7?logo=netlify&logoColor=white)

## Public site

- Lesson information, instructor contact and a gallery of students who passed, loaded from Supabase.
- WhatsApp contact buttons for each instructor that switch off automatically outside 8am to 8pm (UK time) and when that instructor is on holiday.
- Privacy policy, terms and conditions, and refund and cancellation policy pages.

## Instructor dashboard

Instructors sign in with Supabase Auth (email and password, with a password-reset flow) and can:

- Upload, hide and delete gallery photos (stored in Supabase Storage).
- Turn holiday mode on or off, which updates their WhatsApp button on the public site.
- Pause the whole site with a custom maintenance message.
- See an activity log of changes made in the dashboard.
- As admin, manage instructor accounts and send password emails.

## Reliability and security

- If Supabase can't be reached, the public site falls back to built-in default settings so the contact buttons keep working.
- Pausing the site redirects visitors to a maintenance page, with a default message if the database is unavailable.
- Data access is controlled by Supabase Row Level Security, so the publishable key in `supabase-config.js` only allows what the policies permit. No secret keys are in this repo.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html`, `script.js`, `styles.css` | Public homepage and its behaviour |
| `js/site-settings.js` | Site pause check and maintenance page |
| `instructor-login.html`, `instructor-dashboard.html`, `instructor-auth.js` | Instructor sign-in and dashboard |
| `reset-password.html`, `reset-password.js` | Password reset flow |
| `supabase-config.js` | Supabase project URL and publishable key |

## Run locally

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Photos of real students are not included in this repo for their privacy.
