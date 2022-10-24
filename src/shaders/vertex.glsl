uniform float uTime;
uniform float uSize;
uniform vec2 uCursor;

attribute vec3 aRandomness;
attribute float aScale;

varying vec3 vColor;
varying float distanceToCenter;
varying float distanceToCursor;

void main()
{
    /**
     * Position
     */

    vec3 pos = position;
    //    float distanceToCursor = distance(pos.xz, vec2(1));
    //    pos.y -= 1.0-step(0.4, distanceToCursor);

    vec4 modelPosition = modelMatrix * vec4(pos, 1.5);

    // Rotate
    float angle = atan(modelPosition.x, modelPosition.z);
    distanceToCenter = length(modelPosition.xz);
    //    float distanceToCursor = distance(modelPosition.xz, uCursor);

    float angleOffset = (1.0 / distanceToCenter) * uTime;
    angle += angleOffset;
    modelPosition.x = cos(angle) * distanceToCenter;
    modelPosition.z = sin(angle) * distanceToCenter;
    //    modelPosition.y += 0.045*(1.0-step(0.25, distanceToCenter))/distanceToCenter;
    //    modelPosition.y -= 0.2*(1.0-step(0.50, distanceToCenter))*pow(cos(distanceToCenter),2.0);

    // Randomness
    modelPosition.xyz += aRandomness;

    // No idea why 1.41 works here. Should it be 1.5?
    distanceToCursor = distance(modelPosition.xz, 1.41*uCursor);
    vec2 direction = normalize(modelPosition.xz - 1.41*uCursor);
    //    modelPosition.xz -= 0.2*(1.0-step(limit, distanceToCursor))*direction*cos(2.0*3.14*distanceToCursor*limit);
    // Cool
    //    float limit1 = 0.2;
    //    float limit2 = 1.0;
    //    modelPosition.y -= (1.0-step(limit2, distanceToCursor))
    //        *step(limit1, distanceToCursor)
    //        *pow(limit1/distanceToCursor, 1.5);

    float limit1 = 0.2;
    float limit2 = 2.0;
    modelPosition.y -= 0.5*(1.0-smoothstep(limit2-1.0,limit2, distanceToCursor))
    *step(limit1, distanceToCursor)
    *pow(limit1/distanceToCursor, 1.0);


    //    modelPosition.y = step(limit1, distanceToCenter);
    //    modelPosition.y = (step(limit2, distanceToCenter)*(1.0-step(limit1, distanceToCenter)));
    //    0.2*(1.0-step(limit2, distanceToCursor))*direction*cos(2.0*3.14*distanceToCursor*limit2);


    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;



    gl_Position = projectedPosition;

    /**
     * Size
     */
    gl_PointSize = uSize * aScale;
    gl_PointSize *= (1.0 / - viewPosition.z);

    /**
     * Color
     */
    vColor = color;
}
