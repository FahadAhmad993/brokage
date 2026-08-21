import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { ChatThreadEntity } from '../../modules/chats/entities/chat-thread.entity';
import { ChatParticipantEntity } from '../../modules/chats/entities/chat-participant.entity';

const COMMON_THREAD_TITLE = 'Real Estate community';
const DEFAULT_PASSWORD = 'Password@123';

const TEST_USERS = [
  {
    email: 'alex@example.com',
    displayName: 'Alex Rivera',
    avatarUrl: 'https://i.pravatar.cc/256?img=12',
    bio: 'Usually replies within an hour',
  },
  {
    email: 'sam@example.com',
    displayName: 'Sam Okonkwo',
    avatarUrl: 'https://i.pravatar.cc/256?img=33',
    bio: 'Coastal stays specialist',
  },
  {
    email: 'guest@example.com',
    displayName: 'Guest User',
    avatarUrl: 'https://i.pravatar.cc/256?img=5',
    bio: 'Looking for the next stay',
  },
];

async function run() {
  await dataSource.initialize();
  const usersRepository = dataSource.getRepository(UserEntity);
  const threadsRepository = dataSource.getRepository(ChatThreadEntity);
  const participantsRepository = dataSource.getRepository(
    ChatParticipantEntity,
  );

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const seededUsers: UserEntity[] = [];

  for (const testUser of TEST_USERS) {
    let user = await usersRepository.findOne({
      where: { email: testUser.email.toLowerCase() },
    });
    if (!user) {
      user = usersRepository.create({
        email: testUser.email.toLowerCase(),
        displayName: testUser.displayName,
        avatarUrl: testUser.avatarUrl,
        bio: testUser.bio,
        passwordHash,
      });
    } else {
      user.displayName = testUser.displayName;
      user.avatarUrl = testUser.avatarUrl;
      user.bio = testUser.bio;
      user.passwordHash = passwordHash;
    }
    seededUsers.push(await usersRepository.save(user));
  }

  let commonThread = await threadsRepository.findOne({
    where: { type: 'group' },
  });
  if (!commonThread) {
    commonThread = await threadsRepository.save(
      threadsRepository.create({
        type: 'group',
        title: COMMON_THREAD_TITLE,
      }),
    );
  } else if (commonThread.title !== COMMON_THREAD_TITLE) {
    commonThread.title = COMMON_THREAD_TITLE;
    commonThread = await threadsRepository.save(commonThread);
  }

  for (const user of seededUsers) {
    const existing = await participantsRepository.findOne({
      where: { threadId: commonThread.id, userId: user.id },
    });
    if (!existing) {
      await participantsRepository.save(
        participantsRepository.create({
          threadId: commonThread.id,
          userId: user.id,
        }),
      );
    }
  }

  console.log('Seeded test users:');
  for (const user of seededUsers) {
    console.log(`- ${user.email} (password: ${DEFAULT_PASSWORD})`);
  }

  await dataSource.destroy();
}

void run();
