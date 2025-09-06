import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')

  // Seed WfStatus
  console.log('Seeding WfStatus...')
  await prisma.wfStatus.createMany({
    data: [
      { code: 'CLEAR', name: 'Clear', sortOrder: 1 },
      { code: 'OBJECTION', name: 'Objection', sortOrder: 2 },
      { code: 'PENDING', name: 'Pending', sortOrder: 3 },
      { code: 'PENDING_PAYMENT', name: 'Pending Payment', sortOrder: 4 },
    ],
  })

  // Seed WfSection
  console.log('Seeding WfSection...')
  await prisma.wfSection.createMany({
    data: [
      { code: 'BCA', name: 'Building Control Authority', sortOrder: 1 },
      { code: 'HOUSING', name: 'Housing Department', sortOrder: 2 },
      { code: 'ACCOUNTS', name: 'Accounts Department', sortOrder: 3 },
      { code: 'WATER', name: 'Water Department', sortOrder: 4 },
    ],
  })

  // Seed WfSectionGroup
  console.log('Seeding WfSectionGroup...')
  await prisma.wfSectionGroup.createMany({
    data: [
      { code: 'BCA_HOUSING', name: 'BCA & Housing Group', sortOrder: 1 },
      { code: 'ACCOUNTS', name: 'Accounts Group', sortOrder: 2 },
    ],
  })

  // Seed WfSectionGroupMember
  console.log('Seeding WfSectionGroupMember...')
  const bcaSection = await prisma.wfSection.findUnique({ where: { code: 'BCA' } })
  const housingSection = await prisma.wfSection.findUnique({ where: { code: 'HOUSING' } })
  const accountsSection = await prisma.wfSection.findUnique({ where: { code: 'ACCOUNTS' } })
  const bcaHousingGroup = await prisma.wfSectionGroup.findUnique({ where: { code: 'BCA_HOUSING' } })
  const accountsGroup = await prisma.wfSectionGroup.findUnique({ where: { code: 'ACCOUNTS' } })

  if (bcaSection && housingSection && bcaHousingGroup) {
    await prisma.wfSectionGroupMember.createMany({
      data: [
        { sectionGroupId: bcaHousingGroup.id, sectionId: bcaSection.id, sortOrder: 1 },
        { sectionGroupId: bcaHousingGroup.id, sectionId: housingSection.id, sortOrder: 2 },
      ],
    })
  }

  if (accountsSection && accountsGroup) {
    await prisma.wfSectionGroupMember.createMany({
      data: [
        { sectionGroupId: accountsGroup.id, sectionId: accountsSection.id, sortOrder: 1 },
      ],
    })
  }

  // Seed WfStage
  console.log('Seeding WfStage...')
  await prisma.wfStage.createMany({
    data: [
      { code: 'SUBMITTED', name: 'Submitted', sortOrder: 1 },
      { code: 'UNDER_SCRUTINY', name: 'Under Scrutiny', sortOrder: 2 },
      { code: 'BCA_PENDING', name: 'BCA Pending', sortOrder: 3 },
      { code: 'HOUSING_PENDING', name: 'Housing Pending', sortOrder: 4 },
      { code: 'BCA_HOUSING_CLEAR', name: 'BCA & Housing Clear', sortOrder: 5 },
      { code: 'ON_HOLD_BCA', name: 'On Hold - BCA', sortOrder: 6 },
      { code: 'ON_HOLD_HOUSING', name: 'On Hold - Housing', sortOrder: 7 },
      { code: 'ACCOUNTS_PENDING', name: 'Accounts Pending', sortOrder: 8 },
      { code: 'PAYMENT_PENDING', name: 'Payment Pending', sortOrder: 9 },
      { code: 'READY_FOR_APPROVAL', name: 'Ready for Approval', sortOrder: 10 },
      { code: 'APPROVED', name: 'Approved', sortOrder: 11 },
      { code: 'REJECTED', name: 'Rejected', sortOrder: 12 },
      { code: 'COMPLETED', name: 'Completed', sortOrder: 13 },
    ],
  })

  // Seed WfTransition
  console.log('Seeding WfTransition...')
  const stages = await prisma.wfStage.findMany()
  const stageMap = new Map(stages.map(stage => [stage.code, stage.id]))

  const transitions = [
    { from: 'SUBMITTED', to: 'UNDER_SCRUTINY', guard: 'GUARD_INTAKE_COMPLETE' },
    { from: 'UNDER_SCRUTINY', to: 'BCA_PENDING', guard: 'GUARD_SCRUTINY_COMPLETE' },
    { from: 'UNDER_SCRUTINY', to: 'HOUSING_PENDING', guard: 'GUARD_SCRUTINY_COMPLETE' },
    { from: 'BCA_PENDING', to: 'BCA_HOUSING_CLEAR', guard: 'GUARD_BCA_CLEAR' },
    { from: 'BCA_PENDING', to: 'ON_HOLD_BCA', guard: 'GUARD_BCA_OBJECTION' },
    { from: 'HOUSING_PENDING', to: 'BCA_HOUSING_CLEAR', guard: 'GUARD_HOUSING_CLEAR' },
    { from: 'HOUSING_PENDING', to: 'ON_HOLD_HOUSING', guard: 'GUARD_HOUSING_OBJECTION' },
    { from: 'BCA_HOUSING_CLEAR', to: 'ACCOUNTS_PENDING', guard: 'GUARD_CLEARANCES_COMPLETE' },
    { from: 'ON_HOLD_BCA', to: 'BCA_PENDING', guard: 'GUARD_BCA_RESOLVED' },
    { from: 'ON_HOLD_HOUSING', to: 'HOUSING_PENDING', guard: 'GUARD_HOUSING_RESOLVED' },
    { from: 'ACCOUNTS_PENDING', to: 'PAYMENT_PENDING', guard: 'GUARD_ACCOUNTS_CALCULATED' },
    { from: 'PAYMENT_PENDING', to: 'READY_FOR_APPROVAL', guard: 'GUARD_PAYMENT_VERIFIED' },
    { from: 'READY_FOR_APPROVAL', to: 'APPROVED', guard: 'GUARD_APPROVAL_COMPLETE' },
    { from: 'READY_FOR_APPROVAL', to: 'REJECTED', guard: 'GUARD_APPROVAL_REJECTED' },
    { from: 'APPROVED', to: 'COMPLETED', guard: 'GUARD_DEED_FINALIZED' },
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
  await prisma.person.createMany({
    data: [
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
    ],
  })

  // Seed demo Plot data
  console.log('Seeding demo Plot data...')
  await prisma.plot.createMany({
    data: [
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
    ],
  })

  console.log('Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
