import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const run = async () => {
  const result = await resend.emails.send({
    from: "Resend Test <onboarding@resend.dev>",
    to: "framescalemarketing@framescalemarketing.com",
    subject: "Resend domain verified test",
    html: "<p>Resend is configured and sending from framescalemarketing.com.</p>",
  })

  console.log(JSON.stringify(result, null, 2))
}

run().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
