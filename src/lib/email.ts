import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const awsConfigured =
    !!process.env.AWS_ACCESS_KEY_ID &&
    !!process.env.AWS_SECRET_ACCESS_KEY &&
    !!process.env.SES_FROM_EMAIL;

const ses: SESv2Client | null = awsConfigured
    ? new SESv2Client({ region: process.env.AWS_REGION || "us-east-1" })
    : null;

function buildFromAddress(): string {
    const fromName = process.env.SES_FROM_NAME || "UTSAV";
    return `${fromName} <${process.env.SES_FROM_EMAIL}>`;
}

async function sendEmail(
    to: string,
    subject: string,
    html: string
): Promise<{ data?: unknown; error?: unknown }> {
    if (!ses) {
        console.warn(
            "Email service not configured (AWS SES env vars missing). Skipping email."
        );
        return { error: "Email service not configured" };
    }

    try {
        const command = new SendEmailCommand({
            FromEmailAddress: buildFromAddress(),
            Destination: { ToAddresses: [to] },
            Content: {
                Simple: {
                    Subject: { Data: subject },
                    Body: { Html: { Data: html } },
                },
            },
        });
        const data = await ses.send(command);
        return { data };
    } catch (err: any) {
        console.error("Failed to send email:", err);
        return { error: err.message || "Unknown email error" };
    }
}

function renderBrandedEmail(bodyHtml: string): string {
    return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          ${bodyHtml}
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #718096;">
            If you didn't request this email, you can safely ignore it.
          </p>
        </div>
    `;
}

export async function sendInvitationEmail(
    to: string,
    inviteLink: string,
    organizationName: string
) {
    return sendEmail(
        to,
        `You're invited to join ${organizationName}`,
        renderBrandedEmail(`
          <h2 style="color: #1a202c;">You've been invited to join ${organizationName}</h2>
          <p style="font-size: 16px; color: #4a5568;">
            Click the button below to accept your invitation.
          </p>
          <div style="margin: 30px 0;">
            <a href="${inviteLink}"
               style="background-color: #ff7a18; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 14px; color: #718096;">
            This link expires in 48 hours.
          </p>
        `)
    );
}

export async function sendOtpEmail(
    to: string,
    otpCode: string,
    expiresInMinutes: number
) {
    return sendEmail(
        to,
        `Your UTSAV verification code is ${otpCode}`,
        renderBrandedEmail(`
          <h2 style="color: #1a202c;">Your verification code</h2>
          <p style="font-size: 16px; color: #4a5568;">
            Use the code below to sign in to your UTSAV account. This code is single-use and
            expires in ${expiresInMinutes} minutes.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #ff7a18; background: #fff7ed; padding: 12px 24px; border-radius: 8px; display: inline-block;">
              ${otpCode}
            </span>
          </div>
          <p style="font-size: 12px; color: #718096;">
            Never share this code with anyone. UTSAV will never ask for it.
          </p>
        `)
    );
}
