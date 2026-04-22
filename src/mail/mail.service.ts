import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Used at signup
  async sendOtpEmail(email: string, otp: string) {
    await this.transporter.sendMail({
      from: '"Clutch" <no-reply@clutch.app>',
      to: email,
      subject: 'Verify your email',
      html: `
        <h2>Your verification code</h2>
        <p>Enter this code to verify your email:</p>
        <h1 style="font-family: monospace; letter-spacing: 4px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      `,
    });
  }

  // Used at login from new device
  async sendLoginCode(email: string, otp: string) {
    await this.transporter.sendMail({
      from: '"Clutch" <no-reply@clutch.app>',
      to: email,
      subject: 'Your Clutch login code',
      html: `
        <h2>Login verification code</h2>
        <p>Someone tried to log in to your Clutch account from a new device.</p>
        <p>Enter this code to continue:</p>
        <h1 style="font-family: monospace; letter-spacing: 4px;">${otp}</h1>
        <p>This code expires in 10 minutes. If this wasn't you, change your password immediately.</p>
      `,
    });
  }

  // Used for sensitive actions (change email / password)
  async sendActionCode(email: string, otp: string, action: string) {
    await this.transporter.sendMail({
      from: '"Clutch" <no-reply@clutch.app>',
      to: email,
      subject: `Confirm: ${action}`,
      html: `
        <h2>Confirm this action</h2>
        <p>You requested to <strong>${action}</strong>. Use this code to confirm:</p>
        <h1 style="font-family: monospace; letter-spacing: 4px;">${otp}</h1>
        <p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      `,
    });
  }
