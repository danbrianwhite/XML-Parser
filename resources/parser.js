module.exports = {
  parseFromString: function(string, options) {
    var result = parseTagInner(string, 0);
    return result;
  }
}
function parseTagInner(inner, index) {
  var inners = [];
  var currIndex = 0;
  while (getTag(currIndex, inner) != null) {
    var tag = getTag(currIndex, inner);
    if (typeof tag === "string") {
      var tag = checkExclamationTag(/<!\[CDATA\[/, /\]\]>/, tag, inner);
      inners.push(getTextNode(tag, index));
      currIndex = currIndex + tag.length;
    }
    else if (typeof tag === "object") {
      inners.push(getElement(tag, index));
      currIndex = tag.end.end + 1;
    }
    index++;
  }
  return inners;
}
function checkExclamationTag(exclStart, exclEnd, tag, inner) {
  var charDataStart = tag.search(exclStart);
  if (charDataStart > -1) {
    var charDataEnd = regexIndexOf(inner, exclEnd, charDataStart );
    if (charDataEnd > -1) {
      return inner.substring(charDataStart, charDataEnd + 3);
    }
  }
  return tag;
}
function getElement(tag, index) {
  return {
    type: "element",
    tagName: tag.begin.tagName,
    attributes: getAttributes(tag.begin),
    childNodes: parseTagInner(tag.inner, index),
    innerXML: tag.inner,
    closing: tag.closing,
    closingChar: tag.closingChar || null
  }
}
function getTextNode(tag, index) {
  return {
    type: "text",
    text: tag,
    index: index
  }
}
function getAttributes(begin) {
  var inner = begin.inner.substring(begin.tagName.length + 1);
  var attrs = {};
  replaceWithoutQuotes(inner.substring(0, inner.length - 1), /\s+/g, "\\_").split("\\_").forEach(function(attr, i) {
    if (attr != "") {
      var opPos = attr.search("=");
      var attrName = attr.substring(0, opPos > -1 ? opPos : Infinity);
      var attrVal = replaceWithoutQuotes(attr.substring(opPos + 1, Infinity), /./g, "").replace(/"/g, "").replace(/&#x3e;/g, ">");
      if (attrName.match(/[a-z]/)) attrs[attrName] = opPos > -1 ? attrVal : true;
    }
  });
  return attrs;
}
function getTagBegin(index, context) {
  var begin = {
    start: regexIndexOf(context, regExsTag('([a-z]|[A-Z]|[0-9]|\\?){1,}'), index)
  };
  begin.end = context.indexOf(">", begin.start);
  begin.inner = context.substring(begin.start, begin.end + 1);
  begin.tagName = begin.inner.split(" ")[0].replace(/(<|>)/g, "");
  return begin;
}
function getTagEnd(begin, context) {
  var end = {
    start: begin.end,
    founded: false
  };
  var endingPositions = indexesOf(context, regExsTag(begin.tagName, "/"), begin.end + 1);
  endingPositions.forEach(function(endingPos) {
    var innerPosText = context.substring(begin.end + 1, endingPos - 1);
    var innerOpenings = indexesOf(innerPosText, regExsTag(begin.tagName));
    var innerClosings = indexesOf(innerPosText, regExsTag(begin.tagName, "/"));
    if (innerClosings.length >= innerOpenings.length && end.founded === false) {
      end.founded = true;
      end.start = endingPos - 1;
    }
  });
  end.end = regexIndexOf(context, />/, end.start);
  end.inner = context.substring(end.start, end.end + 1);
  end.tagName = end.inner.split(" ")[0].replace(/(<|>)/g, "");
  return end;
}
function getTag(index, context) {
  //&#x3e;
  context = replaceWithinQuotes(context, />/g, "&#x3e;");
  var tag = {
    begin: getTagBegin(index, context)
  }
  if (tag.begin.start > index || (tag.begin.start === -1 && index < context.length - 1)) {
    return context.substring(index, tag.begin.start > -1 ? tag.begin.start : undefined);
  }
  if (tag.begin.start < 0) {
    return null;
  }
  tag.end = getTagEnd(tag.begin, context);
  tag.inner = context.substring(tag.begin.end + 1, tag.end.start);
  tag.closing = tag.end.founded;
  if (!tag.closing) {
    var closingChar = context.substr(tag.begin.end - 1, 1);
    tag.closingChar = ["/", "?", "!"].includes(closingChar) ? closingChar : null;
  }
  return tag;
}
function regExsTag(name, addition) {
  return new RegExp('<' + (addition || "") + name + '(\\s(\\s|[a-z]|[A-Z]|[0-9]|\.|:|\/|\"|=)*>|>)');
}
function replaceWithoutQuotes(string, find, replace) {
  return string.split('"').map(function(str, index) {
    return index % 2 ? str : str.replace(find, replace);
  }).join('"');
}
function replaceWithinQuotes(string, find, replace) {
  return string.split('"').map(function(str, index) {
    return index % 2 ? str.replace(find, replace) : str;
  }).join('"');
}
function regexIndexOf(string, regex, startpos) {
  var indexOf = string.substring(startpos || 0).search(regex);
  return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
}
function indexesOf(string, regex, start) {
  var result = [];
  while (regexIndexOf(string, regex, (start || 0)) > -1) {
    start = regexIndexOf(string, regex, (start || 0)) + 1;
    result.push(start);
  }
  return result;
}
