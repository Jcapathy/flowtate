import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ActiveWindowInfo {
  title: string;
  processName: string;
}

/**
 * Get the currently active/focused window info on Windows.
 * Uses PowerShell to query the foreground window.
 */
export async function getActiveWindow(): Promise<ActiveWindowInfo> {
  try {
    const script = `
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        using System.Text;
        public class WinAPI {
          [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
          [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
        }
"@
      $hwnd = [WinAPI]::GetForegroundWindow()
      $sb = New-Object System.Text.StringBuilder 256
      [WinAPI]::GetWindowText($hwnd, $sb, 256) | Out-Null
      $pid = 0
      [WinAPI]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
      $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
      "$($sb.ToString())|$($proc.ProcessName)"
    `;

    const { stdout } = await execAsync(
      `powershell -NoProfile -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { timeout: 3000 },
    );

    const parts = stdout.trim().split('|');
    return {
      title: parts[0] || 'Unknown',
      processName: parts[1] || 'Unknown',
    };
  } catch {
    return { title: 'Unknown', processName: 'Unknown' };
  }
}
