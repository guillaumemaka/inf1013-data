const faker = require('faker')
const db = require('./db')
const jsonServer = require('json-server')
const server = jsonServer.create()
const router = jsonServer.router(db())
const middlewares = jsonServer.defaults()

function hasRole (role, obj) {
  return obj.roles && Array.isArray(obj.roles) && obj.roles.indexOf(role) !== -1
}

function addExtraFields (req, res) {
  if (Array.isArray(res.locals.data)) {
    res.locals.data = res.locals.data.map(obj => {
      obj.isAdmin = hasRole('ADMIN', obj)
      obj.isStudent = hasRole('STUDENT', obj)
      return obj
    })
  }
}

function removeSensitiveData (req, res) {
  if (res.locals.data && res.locals.data.password) {
    delete res.locals.data['password']
  }

  if (Array.isArray(res.locals.data)) {
    res.locals.data = res.locals.data.map(o => {
      if (o.password) {
        delete o['password']
      }
      return o
    })
  }
}

function normalizeLinks (links) {
  return links.split(',')
  .map(link => {
    link = link.replace('<', '')
    .replace('>', '')
    .replace(' ', '')
    .split(';')

    link = {href: link[0], rel: link[1].split('=')[1].replace('\"', '')}
    return link
  })
}

function normalize (req, res) {
  const total = res.get('X-Total-Count')
  // const links = res.get('Link')

  if (total || Array.isArray(res.locals.data)) {
    res.locals.data = {
      items: res.locals.data,
      total: total || res.locals.data.length
      // links: links ? normalizeLinks(links) : null
    }
  }
}

server.use(middlewares)
server.use(jsonServer.bodyParser)

server.post('/api/auth/login', (req, res) => {
  const {username, password} = req.body
  const user = router.db.get('users').find({username, password}).value()
  if (!user) {
    return res.status(404)
  }

  const isAdmin = user.roles && user.roles.indexOf('ADMIN') !== -1

  return res.json({token: faker.random.uuid(), isAdmin, ...user})
})

server.post('/api/auth/send-email-reset-password', (req, res) => {
  const {email} = req.body

  if (!email) {
    return res.status(400).json({error: 'email is required'})
  }

  const user = router.db.get('users').find({email}).value()
  console.log(user)
  if (!user) {
    return res.status(404).json({error: 'no user found in our records exist with this email address'})
  }

  const token = faker.random.uuid()

  const tokenObj = {
    id: faker.random.uuid(),
    token,
    email
  }

  router.db.get('tokens')
  .push(tokenObj)
  .write()

  return res.json({sent: true, token, email })
})

server.post('/api/auth/reset-password', (req, res) => {
  const {token, password, password2} = req.body

  if (password !== password2) {
    return res.status(400).json({error: 'password missmatch'})
  }

  const tokenObj = router.db.get('token').find({token}).value()

  if (tokenObj) {
    return res.status(404).json({error: 'token invalid or expired!'})
  }

  router.db.get('users').find({email: tokenObj.email}).assign({password}).write()

  return res.status(200)
})

// server.use(mung.json(addExtraFields))

router.render = (req, res) => {
  addExtraFields(req, res)
  removeSensitiveData(req, res)
  normalize(req, res)

  res.json(res.locals.data)
}

server.use('/api', router)

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

server.listen(PORT, HOST, () => {
  console.log(`JSON Server is running on http://${HOST}:${PORT}`)
})
