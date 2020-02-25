const faker = require('faker')
const jsonServer = require('json-server')
const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

server.use(middlewares)
server.use(jsonServer.bodyParser)

server.post('/api/auth/login', (req, res) => {
  const {username, password} = req.body
  const user = router.db.get('users').find({username, password}).value()
  if (!user) {
    return res.status(404)
  }
  return res.json({token: faker.random.uuid(), ...user})
})

server.post('/api/auth/send-email-reset-password', (req, res) => {
  const {email} = req.body

  if (!email) {
    return res.status(400).json({error: 'email is required'})
  }

  return res.json({sent: true, token: faker.random.uuid(), email})
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

server.use('/api', router)

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

server.listen(PORT, HOST, () => {
  console.log(`JSON Server is running on http://${HOST}:${PORT}`)
})
