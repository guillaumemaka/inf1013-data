const faker = require('faker')

const defaults = {
  'tokens': [],
  'users': [
    {
      'id': faker.random.uuid(),
      'displayName': 'Guillaume Maka',
      'username': 'guillaumemaka',
      'password': '111111',
      'roles': [
        'ADMIN'
      ]
    },
    {
      'id': faker.random.uuid(),
      'displayName': 'Guillaume Maka',
      'username': 'MAKG03118501',
      'password': '111111',
      'roles': [
        'STUDENT'
      ]
    },
    {
      'id': faker.random.uuid(),
      'displayName': 'Martin Tremblay',
      'username': 'martin.tremblay',
      'password': '809000',
      'roles': [
        'ADMIN'
      ]
    },
    {
      'id': faker.random.uuid(),
      'displayName': 'Martin Michelle',
      'username': 'MARM03118501',
      'password': '809000',
      'email': 'martin.michelle@uqtr.ca',
      'roles': [
        'STUDENT'
      ]
    },
    {
      'id': faker.random.uuid(),
      'displayName': 'Idrick Wilfrield',
      'username': 'KUII25049700',
      'password': '222222',
      'roles': [
        'ADMIN'
      ]
    }
  ],
  'activities': []
}

function createMatricule (firstname, lastname, dateOfBirth) {
  const birhdate = new Date(dateOfBirth)
  const day = birhdate.getDate() < 10 ? '0' + birhdate.getDate() : birhdate.getDate() + ''
  const month = birhdate.getMonth() < 10 ? '0' + birhdate.getMonth() : birhdate.getMonth() + ''
  const year = birhdate.getFullYear() + ''

  const username = lastname.substr(0, 3) + firstname.substr(0, 1) + year + month + day + '01'

  return username.toUpperCase()
}

function createUsers (n = 100) {
  const newUsers = Array.from({length: n}, (_, k) => {
    faker.seed(k)

    const genders = [ 'female', 'male' ]
    const gender = faker.random.arrayElement(genders)
    const lastname = faker.name.lastName(genders.indexOf(gender))
    const firstname = faker.name.lastName(genders.indexOf(gender))
    const birthDate = faker.date.past(50).toISOString()
    const username = createMatricule(firstname, lastname, birthDate.toString())

    const emails = [
         {email: faker.internet.email(firstname, lastname, 'gmail.com')},
         {email: faker.internet.email(firstname, lastname, 'uqtr.ca')}
    ]

    const phoneNumbers = [
         {phoneNumber: faker.phone.phoneNumber()},
         {phoneNumber: faker.phone.phoneNumber()}
    ]

    const address = faker.address.streetName()
    const city = faker.address.city()
    const state = {
      code: faker.address.state(true).toLowerCase(),
      name: faker.address.state()
    }

    const postalCode = faker.address.zipCode()
    const country = faker.address.country()

    const password = '111111'

    return {
      id: faker.random.uuid(),
      email: emails[0].email,
      roles: ['STUDENT'],
      username,
      password,
      firstname,
      lastname,
      birthDate,
      gender,
      emails,
      phoneNumbers,
      address,
      city,
      state,
      postalCode,
      country
    }
  })

  return newUsers
}

function createActivities (n = 100) {
  const activities = Array.from({length: n}, (_, k) => {
    faker.seed(k)

    const activity = {
      id: faker.random.uuid(),
      title: faker.lorem.words(4),
      description: faker.lorem.paragraph(),
      nbSeat: faker.random.number(40),
      level: faker.random.arrayElement([
        { code: 'D', name: 'No Knowledge' },
        { code: 'C', name: 'Novice' },
        { code: 'B', name: 'Advanced' },
        { code: 'A', name: 'Fluent' }
      ]),
      type: faker.random.arrayElement([
        'INDOOR', 'OUTDOOR'
      ]),
      registrations: [],
      createdAt: faker.date.recent(5),
      updatedAt: null
    }

    activity.startDate = faker.date.future(1, new Date())
    activity.endDate = faker.date.future(1, activity.startDate)

    return activity
  })

  return activities
}

module.exports = () => {
  defaults.users = [...defaults.users, ...createUsers()]
  defaults.activities = createActivities()
  defaults.tokens = []
  return defaults
}
