import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')

  // Seed WfStatus
  console.log('Seeding WfStatus...')
  const statuses = [
    { code: 'CLEAR', name: 'Clear', sortOrder: 1 },
    { code: 'OBJECTION', name: 'Objection', sortOrder: 2 },
    { code: 'PENDING', name: 'Pending', sortOrder: 3 },
    { code: 'PENDING_PAYMENT', name: 'Pending Payment', sortOrder: 4 },
  ]
  
  for (const status of statuses) {
    await prisma.wfStatus.upsert({
      where: { code: status.code },
      update: status,
      create: status,
    })
  }

  // Seed WfSection
  console.log('Seeding WfSection...')
  const sections = [
    { code: 'OWO', name: 'One Window Operation', sortOrder: 0 },
    { code: 'BCA', name: 'Building Control Authority', sortOrder: 1 },
    { code: 'HOUSING', name: 'Housing Department', sortOrder: 2 },
    { code: 'ACCOUNTS', name: 'Accounts Department', sortOrder: 3 },
    { code: 'WATER', name: 'Water Department', sortOrder: 4 },
  ]
  
  for (const section of sections) {
    await prisma.wfSection.upsert({
      where: { code: section.code },
      update: section,
      create: section,
    })
  }

  // Seed WfSectionGroup
  console.log('Seeding WfSectionGroup...')
  const sectionGroups = [
    { code: 'BCA_HOUSING', name: 'BCA & Housing Group', sortOrder: 1 },
    { code: 'ACCOUNTS', name: 'Accounts Group', sortOrder: 2 },
  ]
  
  for (const group of sectionGroups) {
    await prisma.wfSectionGroup.upsert({
      where: { code: group.code },
      update: group,
      create: group,
    })
  }

  // Seed WfSectionGroupMember
  console.log('Seeding WfSectionGroupMember...')
  const bcaSection = await prisma.wfSection.findUnique({ where: { code: 'BCA' } })
  const housingSection = await prisma.wfSection.findUnique({ where: { code: 'HOUSING' } })
  const accountsSection = await prisma.wfSection.findUnique({ where: { code: 'ACCOUNTS' } })
  const bcaHousingGroup = await prisma.wfSectionGroup.findUnique({ where: { code: 'BCA_HOUSING' } })
  const accountsGroup = await prisma.wfSectionGroup.findUnique({ where: { code: 'ACCOUNTS' } })

  if (bcaSection && housingSection && bcaHousingGroup) {
    await prisma.wfSectionGroupMember.upsert({
      where: {
        sectionGroupId_sectionId: {
          sectionGroupId: bcaHousingGroup.id,
          sectionId: bcaSection.id,
        },
      },
      update: { sortOrder: 1 },
      create: { sectionGroupId: bcaHousingGroup.id, sectionId: bcaSection.id, sortOrder: 1 },
    })
    
    await prisma.wfSectionGroupMember.upsert({
      where: {
        sectionGroupId_sectionId: {
          sectionGroupId: bcaHousingGroup.id,
          sectionId: housingSection.id,
        },
      },
      update: { sortOrder: 2 },
      create: { sectionGroupId: bcaHousingGroup.id, sectionId: housingSection.id, sortOrder: 2 },
    })
  }

  if (accountsSection && accountsGroup) {
    await prisma.wfSectionGroupMember.upsert({
      where: {
        sectionGroupId_sectionId: {
          sectionGroupId: accountsGroup.id,
          sectionId: accountsSection.id,
        },
      },
      update: { sortOrder: 1 },
      create: { sectionGroupId: accountsGroup.id, sectionId: accountsSection.id, sortOrder: 1 },
    })
  }

  // Seed WfStage
  console.log('Seeding WfStage...')
  const stages = [
    { code: 'SUBMITTED', name: 'Submitted', sortOrder: 1 },
    { code: 'UNDER_SCRUTINY', name: 'Under Scrutiny', sortOrder: 2 },
    { code: 'SENT_TO_BCA_HOUSING', name: 'Sent to BCA & Housing', sortOrder: 3 },
    { code: 'BCA_PENDING', name: 'BCA Pending', sortOrder: 4 },
    { code: 'HOUSING_PENDING', name: 'Housing Pending', sortOrder: 5 },
    { code: 'BCA_HOUSING_CLEAR', name: 'BCA & Housing Clear', sortOrder: 6 },
    { code: 'OWO_REVIEW_BCA_HOUSING', name: 'OWO Review - BCA & Housing', sortOrder: 7 },
    { code: 'SENT_TO_ACCOUNTS', name: 'Sent to Accounts', sortOrder: 8 },
    { code: 'ON_HOLD_BCA', name: 'On Hold - BCA', sortOrder: 9 },
    { code: 'ON_HOLD_HOUSING', name: 'On Hold - Housing', sortOrder: 10 },
    { code: 'ACCOUNTS_PENDING', name: 'Accounts Pending', sortOrder: 11 },
    { code: 'AWAITING_PAYMENT', name: 'Awaiting Payment', sortOrder: 12 },
    { code: 'ON_HOLD_ACCOUNTS', name: 'On Hold - Accounts', sortOrder: 13 },
    { code: 'ACCOUNTS_CLEAR', name: 'Accounts Clear', sortOrder: 14 },
    { code: 'OWO_REVIEW_ACCOUNTS', name: 'OWO Review - Accounts', sortOrder: 15 },
    { code: 'PAYMENT_PENDING', name: 'Payment Pending', sortOrder: 16 },
    { code: 'READY_FOR_APPROVAL', name: 'Ready for Approval', sortOrder: 17 },
    { code: 'APPROVED', name: 'Approved', sortOrder: 18 },
    { code: 'POST_ENTRIES', name: 'Post-Entries', sortOrder: 19 },
    { code: 'REJECTED', name: 'Rejected', sortOrder: 20 },
    { code: 'CLOSED', name: 'Closed', sortOrder: 21 },
    { code: 'COMPLETED', name: 'Completed', sortOrder: 22 },
  ]
  
  for (const stage of stages) {
    await prisma.wfStage.upsert({
      where: { code: stage.code },
      update: stage,
      create: stage,
    })
  }

  // Seed WfTransition
  console.log('Seeding WfTransition...')
  const allStages = await prisma.wfStage.findMany()
  const stageMap = new Map(allStages.map(stage => [stage.code, stage.id]))

  const transitions = [
    { from: 'SUBMITTED', to: 'UNDER_SCRUTINY', guard: 'GUARD_INTAKE_COMPLETE' },
    { from: 'UNDER_SCRUTINY', to: 'SENT_TO_BCA_HOUSING', guard: 'GUARD_SCRUTINY_COMPLETE' },
    { from: 'SENT_TO_BCA_HOUSING', to: 'BCA_PENDING', guard: 'GUARD_SENT_TO_BCA_HOUSING' },
    { from: 'SENT_TO_BCA_HOUSING', to: 'HOUSING_PENDING', guard: 'GUARD_SENT_TO_BCA_HOUSING' },
    { from: 'SENT_TO_BCA_HOUSING', to: 'BCA_HOUSING_CLEAR', guard: 'GUARD_CLEARANCES_COMPLETE' },
    { from: 'BCA_PENDING', to: 'BCA_HOUSING_CLEAR', guard: 'GUARD_BCA_CLEAR' },
    { from: 'BCA_PENDING', to: 'ON_HOLD_BCA', guard: 'GUARD_BCA_OBJECTION' },
    { from: 'HOUSING_PENDING', to: 'BCA_HOUSING_CLEAR', guard: 'GUARD_HOUSING_CLEAR' },
    { from: 'HOUSING_PENDING', to: 'ON_HOLD_HOUSING', guard: 'GUARD_HOUSING_OBJECTION' },
    { from: 'BCA_HOUSING_CLEAR', to: 'OWO_REVIEW_BCA_HOUSING', guard: 'GUARD_BCA_HOUSING_REVIEW' },
    { from: 'OWO_REVIEW_BCA_HOUSING', to: 'SENT_TO_ACCOUNTS', guard: 'GUARD_OWO_REVIEW_COMPLETE' },
    { from: 'SENT_TO_ACCOUNTS', to: 'ACCOUNTS_PENDING', guard: 'GUARD_SENT_TO_ACCOUNTS' },
    { from: 'SENT_TO_ACCOUNTS', to: 'ACCOUNTS_CLEAR', guard: 'GUARD_ACCOUNTS_CLEAR' },
    { from: 'ON_HOLD_BCA', to: 'BCA_PENDING', guard: 'GUARD_BCA_RESOLVED' },
    { from: 'ON_HOLD_HOUSING', to: 'HOUSING_PENDING', guard: 'GUARD_HOUSING_RESOLVED' },
    { from: 'ACCOUNTS_PENDING', to: 'AWAITING_PAYMENT', guard: 'GUARD_SET_PENDING_PAYMENT' },
    { from: 'ACCOUNTS_PENDING', to: 'ON_HOLD_ACCOUNTS', guard: 'GUARD_RAISE_ACCOUNTS_OBJECTION' },
    { from: 'AWAITING_PAYMENT', to: 'ACCOUNTS_CLEAR', guard: 'GUARD_ACCOUNTS_CLEAR' },
    { from: 'AWAITING_PAYMENT', to: 'PAYMENT_PENDING', guard: 'GUARD_ACCOUNTS_CALCULATED' },
    { from: 'ON_HOLD_ACCOUNTS', to: 'ACCOUNTS_PENDING', guard: 'GUARD_ACCOUNTS_OBJECTION_RESOLVED' },
    { from: 'ACCOUNTS_CLEAR', to: 'OWO_REVIEW_ACCOUNTS', guard: 'GUARD_ACCOUNTS_REVIEWED' },
    { from: 'OWO_REVIEW_ACCOUNTS', to: 'READY_FOR_APPROVAL', guard: 'GUARD_OWO_ACCOUNTS_REVIEW_COMPLETE' },
    { from: 'PAYMENT_PENDING', to: 'READY_FOR_APPROVAL', guard: 'GUARD_PAYMENT_VERIFIED' },
    { from: 'READY_FOR_APPROVAL', to: 'APPROVED', guard: 'GUARD_APPROVAL_COMPLETE' },
    { from: 'READY_FOR_APPROVAL', to: 'REJECTED', guard: 'GUARD_APPROVAL_REJECTED' },
    { from: 'APPROVED', to: 'POST_ENTRIES', guard: 'GUARD_START_POST_ENTRIES' },
    { from: 'APPROVED', to: 'COMPLETED', guard: 'GUARD_DEED_FINALIZED' },
    { from: 'POST_ENTRIES', to: 'CLOSED', guard: 'GUARD_CLOSE_CASE' },
  ]

  for (const transition of transitions) {
    const fromStageId = stageMap.get(transition.from)
    const toStageId = stageMap.get(transition.to)
    
    if (fromStageId && toStageId) {
      await prisma.wfTransition.upsert({
        where: {
          fromStageId_toStageId: {
            fromStageId,
            toStageId,
          },
        },
        update: {
          guardName: transition.guard,
        },
        create: {
          fromStageId,
          toStageId,
          guardName: transition.guard,
          sortOrder: transitions.indexOf(transition) + 1,
        },
      })
    }
  }

  // Seed demo Person data
  console.log('Seeding demo Person data...')
  const persons = [
    {
      cnic: '12345-1234567-1',
      name: 'Ahmed Ali',
      fatherName: 'Muhammad Ali',
      address: '123 Main Street, Karachi',
      phone: '+92-300-1234567',
      email: 'ahmed.ali@example.com',
    },
    {
      cnic: '12345-1234567-2',
      name: 'Fatima Khan',
      fatherName: 'Abdul Khan',
      address: '456 Park Avenue, Lahore',
      phone: '+92-300-1234568',
      email: 'fatima.khan@example.com',
    },
    {
      cnic: '12345-1234567-3',
      name: 'Muhammad Hassan',
      fatherName: 'Ali Hassan',
      address: '789 Garden Road, Islamabad',
      phone: '+92-300-1234569',
      email: 'm.hassan@example.com',
    },
    {
      cnic: '12345-1234567-4',
      name: 'Ayesha Malik',
      fatherName: 'Malik Ahmed',
      address: '321 Oak Street, Rawalpindi',
      phone: '+92-300-1234570',
      email: 'ayesha.malik@example.com',
    },
    {
      cnic: '12345-1234567-5',
      name: 'Hassan Raza',
      fatherName: 'Raza Ali',
      address: '654 Pine Street, Faisalabad',
      phone: '+92-300-1234571',
      email: 'hassan.raza@example.com',
    },
  ]
  
  for (const person of persons) {
    await prisma.person.upsert({
      where: { cnic: person.cnic },
      update: person,
      create: person,
    })
  }

  // Seed demo Plot data
  console.log('Seeding demo Plot data...')
  const plots = [
    {
      plotNumber: 'P-001',
      blockNumber: 'B-01',
      sectorNumber: 'S-01',
      area: 500.00,
      location: 'Sector 1, Block 1, Plot 1',
    },
    {
      plotNumber: 'P-002',
      blockNumber: 'B-01',
      sectorNumber: 'S-01',
      area: 750.00,
      location: 'Sector 1, Block 1, Plot 2',
    },
    {
      plotNumber: 'P-003',
      blockNumber: 'B-02',
      sectorNumber: 'S-01',
      area: 600.00,
      location: 'Sector 1, Block 2, Plot 1',
    },
    {
      plotNumber: 'P-004',
      blockNumber: 'B-02',
      sectorNumber: 'S-02',
      area: 800.00,
      location: 'Sector 2, Block 2, Plot 1',
    },
    {
      plotNumber: 'P-005',
      blockNumber: 'B-03',
      sectorNumber: 'S-02',
      area: 650.00,
      location: 'Sector 2, Block 3, Plot 1',
    },
  ]
  
  for (const plot of plots) {
    await prisma.plot.upsert({
      where: { plotNumber: plot.plotNumber },
      update: plot,
      create: plot,
    })
  }

  // Seed demo User data
  console.log('Seeding demo User data...')
  const saltRounds = 12
  const defaultPassword = await bcrypt.hash('password123', saltRounds)

  const users = [
    {
      username: 'admin',
      email: 'admin@mda.gov.pk',
      password: defaultPassword,
      role: 'ADMIN',
      isActive: true,
    },
    {
      username: 'owo_officer',
      email: 'owo@mda.gov.pk',
      password: defaultPassword,
      role: 'OWO',
      isActive: true,
    },
    {
      username: 'bca_officer',
      email: 'bca@mda.gov.pk',
      password: defaultPassword,
      role: 'BCA',
      isActive: true,
    },
    {
      username: 'housing_officer',
      email: 'housing@mda.gov.pk',
      password: defaultPassword,
      role: 'HOUSING',
      isActive: true,
    },
    {
      username: 'accounts_officer',
      email: 'accounts@mda.gov.pk',
      password: defaultPassword,
      role: 'ACCOUNTS',
      isActive: true,
    },
    {
      username: 'water_officer',
      email: 'water@mda.gov.pk',
      password: defaultPassword,
      role: 'WATER',
      isActive: true,
    },
    {
      username: 'approver',
      email: 'approver@mda.gov.pk',
      password: defaultPassword,
      role: 'APPROVER',
      isActive: true,
    },
  ]
  
  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: user,
      create: user,
    })
  }

  console.log('Database seeding completed successfully!')
  console.log('Demo users created with password: password123')
  console.log('Users: admin, owo_officer, bca_officer, housing_officer, accounts_officer, water_officer, approver')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
