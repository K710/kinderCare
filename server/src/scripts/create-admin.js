// Tạo tài khoản admin từ dòng lệnh: npm run create-admin
// Có thể truyền sẵn: npm run create-admin -- --email a@b.vn --name "Quản trị" --password 123456
import readline from 'node:readline';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { ROLES } from '../config/constants.js';
import { assertPasswordPolicy, MIN_PASSWORD_LENGTH } from '../utils/password.js';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    }
  }
  return out;
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Che mật khẩu: ghi đè ký tự gõ ra bằng *
      const onData = (ch) => {
        const c = ch.toString();
        if (c === '\n' || c === '\r' || c === '\u0004') process.stdin.removeListener('data', onData);
        else {
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(question + '*'.repeat(rl.line.length + 1));
        }
      };
      process.stdin.on('data', onData);
    }
    rl.question(question, (ans) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(ans.trim());
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = (args.email || (await ask('Email: '))).toLowerCase();
  const fullName = args.name || (await ask('Họ tên: '));
  const password = args.password || (await ask(`Mật khẩu (≥${MIN_PASSWORD_LENGTH} ký tự): `, { hidden: true }));

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email không hợp lệ');
  if (fullName.length < 2) throw new Error('Họ tên tối thiểu 2 ký tự');
  assertPasswordPolicy(password); // production ≥ 8 ký tự

  await connectDB();
  const exists = await User.findOne({ email });
  if (exists) throw new Error(`Email ${email} đã tồn tại (role: ${exists.role})`);

  const user = await User.create({ email, fullName, password, role: ROLES.ADMIN });
  console.log(`✅ Đã tạo admin: ${user.fullName} <${user.email}> (id ${user._id})`);
}

main()
  .catch((err) => {
    console.error('❌', err.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
