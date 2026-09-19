export class Logger {
  // บันทึกข้อมูลทั่วไปสำหรับการ debug หรือ tracing
  public info(message: string, context?: unknown): void {
    if (context === undefined) {
      console.log(message);
      return;
    }

    console.log(message, context);
  }

  // บันทึกข้อผิดพลาดแบบง่ายและอ่านง่าย
  public error(message: string, error?: Error): void {
    if (!error) {
      console.error(message);
      return;
    }

    console.error(message, error.message);

    if (error.stack) {
      console.error(error.stack);
    }
  }
}

export default Logger;
