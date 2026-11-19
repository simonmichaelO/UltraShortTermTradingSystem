# Try Tickframe’s Access Lab

**This is a separate, temporary web test.** Your regular dashboard remains unchanged. No real or demo broker account, Windows setup or deposit is needed. An authenticator app that supports time-based six-digit codes is needed for pairing and sign-in, not for opening the lab or generating an account.

## First check in Arena

Open the new **Tickframe sign-in lab v0.3.2** Live Preview. Choose **Open sign-in lab**, then **Create test account without cookies**. You should see **Set up your authenticator**. This is the first checkpoint. Report only whether that heading appeared, or the words of an error message. Never send your password, QR code, setup key, one-time code or a screenshot showing any of them.

## What comes next

1. Keep the lab open. Note the generated **Test username** and **Test password** privately (they are for this lab only). Complete pairing within 20 minutes. If you close or reload the setup, create a fresh test account rather than trying to recover a forgotten test password.
2. In an authenticator app, add a time-based account. If the lab is on another screen, scan the QR code **from the authenticator app**. If you are using only one phone, expand **Use a manual setup key**, copy the key privately, name the new entry **Tickframe Access Lab**, and choose **Time based** if the app asks. Supply the new six-digit code to **Pair authenticator**. Pairing does not sign you in.
3. On **Enter your test credentials**, enter the generated credentials. Immediately after pairing, **Use generated test password** can fill the field without a paste. Select **Continue to authenticator**. This password step alone cannot open the workspace.
4. Use a **fresh** six-digit code. Wait for the code to change if it was just used to pair. Select **Verify and sign in**. Look for **Test workspace**, **Sign-in → Verified**, **MT5 connection → Not connected**, and **Live entries → Locked**. No market data or trade permissions have been unlocked.
5. Click **Sign out** to end the test session. The account itself lasts up to four hours after pairing or until the lab restarts. You can remove the temporary entry from your authenticator app when finished.

## If something doesn’t look right

- **Setup cookie warning in Arena:** close the old preview and open **Tickframe sign-in lab v0.3.2**. The hosted form now has one account-creation button, **Create test account without cookies**. It does not attempt to use cookies. Keep the preview open: refreshing or closing it loses the tab-only setup or sign-in. If you already paired a test account and privately saved its credentials, **I have test credentials** starts a new two-factor sign-in.
- **Code rejected:** wait for a fresh code, check the right entry and ensure your device’s date and time are automatic. After repeated failures, wait as instructed; if setup or the sign-in challenge expired, start that step again.
- **Test account stopped working:** account expiry/restart is intentional. Create a new temporary identity in the lab. Do not type a broker or personal password as a workaround.
- **You see the charts and Overview instead:** that's the regular Tickframe preview. Switch to the separate **Tickframe sign-in lab** Live Preview.

If you specifically want a local copy, see the [lab’s optional Windows setup](../../Backend/AuthLab.md). The hosted preview is enough for these checks.
