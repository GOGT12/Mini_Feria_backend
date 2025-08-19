const validator = require('validator')


function isNonEmptyString(value:any): boolean{
  return typeof value === 'string' && value.trim().length > 0;
}



function isValidEmail(email: string): boolean {
  if (!isNonEmptyString(email)) {
    return false;
  }

  return validator.isEmail(email.trim());
}


function isValidPassword(password: string): boolean {

  if (!isNonEmptyString(password)){
    return false;
  }

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/~`-])[A-Za-z\d!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/~`-]{8,}$/;
  return passwordRegex.test(password);
}


function isValidRole(role: string, allowedRoles: string[]): boolean {
  if (!isNonEmptyString(role)) {
    return false;
  }
  return allowedRoles.map(r => r.toLowerCase()).includes(role.toLowerCase());
}


function isValidNumber(
  number:number
):boolean{

  if (!(typeof number === 'number')){
    return false;
  }
  if (number < 0){
    return false;
  }
  if (!(Number.isFinite(number))){
    return false;
  }

  const numberString = String(number);
  const decimalIndex = numberString.indexOf('.');

  if (decimalIndex === -1){
    if(numberString.length <= 10){
      return true
    }
    return false
  } else {

    const integerPart = numberString.slice(0,decimalIndex);
    const decimalPart = numberString.slice(decimalIndex + 1);

    if(integerPart.length <= 10 && decimalPart.length <= 2){
      return true
    }
    return false
  }
}


const validation = {
  isNonEmptyString,
  isValidEmail,
  isValidPassword,
  isValidRole,
  isValidNumber,
}

export default validation;
