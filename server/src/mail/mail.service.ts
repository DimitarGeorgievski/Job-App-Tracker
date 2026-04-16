import { Injectable } from '@nestjs/common';
import emailjs from '@emailjs/nodejs';

@Injectable()
export class MailService {
  async sendFollowUpReminder(
    toEmail: string,
    userName: string,
    jobTitle: string,
  ) {
    return emailjs.send(
      process.env.EMAILJS_SERVICE_ID!,
      process.env.EMAILJS_TEMPLATE_ID!,
      {
        to_email: toEmail,
        user_name: userName,
        job_title: jobTitle,
      },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY!,
        privateKey: process.env.EMAILJS_PRIVATE_KEY!,
      },
    );
  }
}