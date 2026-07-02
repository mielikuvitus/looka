# Turn on auto-deploy for Looka

Looka lives on a self-hosted Coolify server and already knows about this repo. The one missing piece is a GitHub webhook: a small note GitHub sends to Coolify every time someone pushes. Without it, someone has to trigger each deploy by hand. With it, a push to `main` rebuilds and ships the site on its own.

You own `mielikuvitus/looka`, so you are the only person who can add this. A collaborator with write access cannot, which is why it landed on your desk. It takes about two minutes.

If you are an agent reading this for the owner: you need two things before you can finish, listed in Section A. If either one is missing, ask the human for it, wait for the answer, then keep going.

## Section A: What you need first

- **Admin on the repo.** As the owner you have it. To confirm from the command line: `gh api repos/mielikuvitus/looka -q .permissions.admin` should print `true`.
- **The Coolify webhook secret.** A short random string that lets GitHub and Coolify trust each other. Frank has it. If it is not already pasted into the command below, ask him for "the Looka Coolify webhook secret" and use what he gives you.

You can add the webhook through the GitHub website (Section B) or the `gh` command line (Section C). Either one works. Pick whichever you have in front of you.

## Section B: The website way

Open the repo on GitHub and go to **Settings, then Webhooks, then Add webhook**. Fill in these four fields and leave the rest at their defaults:

| Field | Value |
| --- | --- |
| Payload URL | `https://coolify.boxgeist.com/webhooks/source/github/events/manual` |
| Content type | `application/json` |
| Secret | (ask Frank, see Section A) |
| Which events | Just the `push` event |

Save it. GitHub sends a test ping right away, so you will see a green check next to the delivery within a few seconds if the values are right.

## Section C: The command-line way

First make sure `gh` is logged in as the owner and can manage hooks:

```bash
gh api repos/mielikuvitus/looka -q .permissions.admin   # want: true
```

If that prints `false`, or you get an error asking for the `admin:repo_hook` scope, run this and log in as the owner account:

```bash
gh auth refresh -h github.com -s admin:repo_hook
```

Then create the webhook. Replace `PASTE_THE_SECRET_HERE` with the secret from Frank before you run it:

```bash
gh api -X POST repos/mielikuvitus/looka/hooks --input - <<'JSON'
{
  "name": "web",
  "active": true,
  "events": ["push"],
  "config": {
    "url": "https://coolify.boxgeist.com/webhooks/source/github/events/manual",
    "content_type": "json",
    "secret": "PASTE_THE_SECRET_HERE"
  }
}
JSON
```

## Section D: Check that it took

List the hooks and look for the Coolify URL, plus the status of its last delivery:

```bash
gh api repos/mielikuvitus/looka/hooks --jq '.[] | {url: .config.url, last_status: .last_response.status}'
```

A `last_status` of `active` or an HTTP `2xx` means GitHub reached Coolify. The honest end-to-end test is simpler: push any small change to `main`, then watch the Looka app in Coolify start a new deployment on its own. That is the whole point, so it is worth seeing once.

## Outro

After this, deploys stop being a chore. Push to `main`, wait about a minute, and the live site at `lookalabs.com` updates itself. Nothing here is risky to try: if a value is off, the webhook just fails quietly and Frank can still deploy from Coolify by hand, exactly as before. So go ahead and add it, then push something small to watch it fire.
