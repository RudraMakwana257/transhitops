from marshmallow import Schema, fields, validates, pre_load, ValidationError

class S1(Schema):
    email = fields.Email()
    
    @validates('email')
    def normalise(self, value, **kwargs):
        print("validates kwargs:", kwargs)
        return value.lower()

class S2(Schema):
    email = fields.Email()
    
    @pre_load
    def normalise(self, data, **kwargs):
        if 'email' in data:
            data['email'] = data['email'].lower()
        return data

s1 = S1()
try:
    print(s1.load({'email': 'FOO@BAR.COM'}))
except Exception as e:
    print("S1 Error:", repr(e))

s2 = S2()
try:
    print(s2.load({'email': 'FOO@BAR.COM'}))
except Exception as e:
    print("S2 Error:", repr(e))
