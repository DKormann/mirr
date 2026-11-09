type U is Data:
  u{}


type N is Data:
  z{}
  s{n: N}

def a_f (~u: U) -> U : u

def a_consume( ~f: (@-x:U -> U)) -> U: u{}

def a(x: U) -> U:
  a_consume(a_f) # allowed?!




def K () -> Type :
  @-x:K -> U

def id (~x: K) -> @-s:K -> U: x


def pr(~x: K) -> U:
  # id(x)(x)
  x(x)


def ff(~k: (@-x:K -> U)) -> K:
  k

# def kk()->K:
#   ff(pr) # not allowed!


# def uu() -> U:
#   pr(pr)



# def K () -> Type:
  # @~x:K->U

# def id 

def ffnd(a: N, b: N) -> N:
  match a:
  case z{}: b
  case s{+n}:
    match b:
    case z{}:
      ffnd(n, s{b})
    case s{k}:
      ffnd(a, k)