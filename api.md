# Travel express API

## User

Fields   |Description   |Type|Access
---------|--------------|---|---
id       |Identifier    |String
mail     |Email address |String mail format
tel      |Phone number  |String tel format
password |Hashed password|String min 6 | private
firstName|First name    |String min 2
lastName |Last name     |String min 2
vehicle  |Vehicle model |String optional
seats    |Seat count    |[1-10]
baggage  |Size of baggage|[small, medium, big]
talk     |Want to talk  |[no, little, yes]
smoke    |Allow to smoke|Boolean

---

Request|Input|Output
---|---|---
GET /user/:id|user id|user object
POST /user|mail, tel, password, firstName, lastName|token
POST /user/login|mail, password|token
PUT /user/:id|user id and fields to update|
DELETE /user/:id|user id|

## Trip

Fields      |Description   |Type 
------------|--------------|---
id          |Identifier    |String
user        |Transporter   |User Object
fromLocation|Starting city |String
fromDate    |Starting date |Date / time
toLocation  |Ending city   |String
toDate      |Ending date   |Date / time
repeat      |Frequency     |[no, daily, weekly, monthly]

```http
GET /trip             # list
GET /trip/:id         # detail
POST /trip            # create [auth]
PUT /trip/:id         # update [auth]
DELETE /trip/:id      # delete [auth]
```

## Reservation


Fields      |Description   |Type 
------------|--------------|---
id          |Identifier    |String
trip      |Target trip |Trip Object
user        |Who reserve   |User Object
seats       |Amount of seat|[1-10]
paid        |Is paid       | Boolean

```http
GET /reservation            # list
GET /reservation/:id        # detail
POST /reservation           # create [auth]
PUT /reservation/:id        # update [auth]
DELETE /reservation/:id     # delete [auth]
```