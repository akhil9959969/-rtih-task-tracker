# AI usage disclosure

I used Instinct, an AI assistant, to help build this project. It generated the React frontend, PHP API and SQL schema, set up the automated tests, and prepared the documentation drafts. It also helped me write this disclosure in clear English.

## Testing and review

The AI assistant ran 28 automated API checks, 13 browser checks and 12 mobile responsive checks. The results and bugs found during development are recorded in TESTING.md.

I ran the app on my own Windows XAMPP setup and checked the Windows test checklist in TESTING.md with guidance. I also made and tested the small code change described below. The automated tests were run by the AI assistant, not by me.

## My change

In api/register.php, I changed the error message shown when someone tries to register with an email that already has an account. I wrote the message in my own words. I tested it by trying to register again with the same email, and my new message appeared under the Email field.